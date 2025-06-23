// グローバル変数
let state = {
  jsonData: '',
  extractedFields: [],
  selectedFields: [],
  chartType: 'bar',
  showPreview: false,
  isExtracting: false,
  showAddField: false,
  newField: { name: '', type: 'number' },
  memo: '',
  isExporting: false,
  patterns: [],
  currentPattern: 0,
  projectName: '',
  alertSettings: {},
  showAlertSettings: false,
  savedProjects: [],
  currentView: 'home',
  selectedProject: null
};

// 提案テンプレート定義
const proposalTemplates = {
  quality: {
    name: '品質管理ダッシュボード',
    description: '不良率、品質スコア、検査結果の分析',
    preferredFields: ['不良', '品質', '検査', '良品', 'スコア', '判定'],
    chartType: 'composed',
    memo: '品質管理の可視化により、不良品の早期発見と品質向上を実現できます。\n• 不良率の推移監視\n• 品質基準値との比較\n• 検査結果のトレンド分析'
  },
  production: {
    name: '生産効率分析',
    description: '生産数、稼働率、作業時間の最適化',
    preferredFields: ['生産', '稼働', '作業時間', '効率', '数量', 'SPM'],
    chartType: 'bar',
    memo: '生産効率の見える化により、ボトルネックの特定と改善が可能です。\n• 生産数の日次推移\n• 設備稼働率の監視\n• 作業時間の最適化'
  },
  maintenance: {
    name: '設備保全レポート',
    description: '温度、振動、稼働時間の監視',
    preferredFields: ['温度', '湿度', 'ショット', '累計', '稼働', '点検'],
    chartType: 'line',
    memo: '予防保全により設備の長寿命化とダウンタイム削減を実現します。\n• 設備状態の常時監視\n• 保全タイミングの最適化\n• 異常予兆の早期検知'
  }
};

// 初期化
document.addEventListener('DOMContentLoaded', function() {
  // Lucideアイコンの初期化
  lucide.createIcons();
  
  // localStorageから保存データを読み込み
  loadFromLocalStorage();
  
  // イベントリスナーの設定
  setupEventListeners();
  
  // 初期表示の更新
  updateUI();
});

// イベントリスナーの設定
function setupEventListeners() {
  // ナビゲーション
  document.getElementById('homeBtn').addEventListener('click', () => switchView('home'));
  document.getElementById('historyBtn').addEventListener('click', () => switchView('history'));
  
  // プロジェクト管理
  document.getElementById('newProjectBtn').addEventListener('click', startNewProject);
  document.getElementById('projectName').addEventListener('input', (e) => {
    state.projectName = e.target.value;
    saveToLocalStorage();
  });
  
  // ファイル入力
  document.getElementById('fileSelectBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  document.getElementById('fileInput').addEventListener('change', handleJsonFileUpload);
  document.getElementById('jsonTextarea').addEventListener('input', (e) => {
    state.jsonData = e.target.value;
  });
  document.getElementById('parseJsonBtn').addEventListener('click', () => {
    if (state.jsonData.trim()) {
      extractFieldsFromJson(state.jsonData);
    }
  });
  
  // 項目追加
  document.getElementById('addFieldBtn').addEventListener('click', () => {
    state.showAddField = !state.showAddField;
    updateAddFieldForm();
  });
  document.getElementById('addFieldSubmit').addEventListener('click', addCustomField);
  
  // 異常値設定
  document.getElementById('alertSettingsBtn').addEventListener('click', () => {
    state.showAlertSettings = !state.showAlertSettings;
    updateAlertSettings();
  });
  
  // チャートタイプ選択
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.currentTarget.dataset.type;
      state.chartType = type;
      updateChartTypeButtons();
      if (state.showPreview) {
        renderChart();
      }
    });
  });
  
  // メモ
  document.getElementById('memoTextarea').addEventListener('input', (e) => {
    state.memo = e.target.value;
  });
  
  // プレビューとエクスポート
  document.getElementById('previewBtn').addEventListener('click', showPreview);
  document.getElementById('savePatternBtn').addEventListener('click', saveCurrentPattern);
  document.getElementById('exportBtn').addEventListener('click', exportChartWithMemo);
  
  // テンプレートボタン
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const template = e.currentTarget.dataset.template;
      applyTemplate(template);
    });
  });
}

// ビュー切り替え
function switchView(view) {
  state.currentView = view;
  
  // ナビゲーションボタンの更新
  document.querySelectorAll('.nav-button').forEach(btn => {
    btn.classList.remove('active');
  });
  if (view === 'home') {
    document.getElementById('homeBtn').classList.add('active');
    document.getElementById('homeView').classList.remove('hidden');
    document.getElementById('historyView').classList.add('hidden');
  } else {
    document.getElementById('historyBtn').classList.add('active');
    document.getElementById('homeView').classList.add('hidden');
    document.getElementById('historyView').classList.remove('hidden');
    updateProjectsList();
  }
  
  // アイコンの再描画
  lucide.createIcons();
}

// JSONファイルアップロード
function handleJsonFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      state.jsonData = e.target.result;
      document.getElementById('jsonTextarea').value = state.jsonData;
      extractFieldsFromJson(state.jsonData);
    };
    reader.readAsText(file);
  }
}

// JSON解析
function extractFieldsFromJson(jsonString) {
  console.log('JSON処理を開始:', jsonString);
  
  if (!jsonString || jsonString.trim() === '') {
    return;
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    console.log('JSON解析成功:', parsed);
    
    const fields = [];
    
if (parsed.format && parsed.format.boxes) {
  parsed.format.boxes.forEach(box => {
    if (box.name && box.dataType) {
      fields.push({
        id: box.fieldID || box.name.replace(/[^a-zA-Z0-9]/g, '_'),
        name: box.name,
        type: box.dataType === 'string' ? 'string' : 'number'
      });
    }
  });
  
  // tablesからカラム項目を抽出
  if (parsed.format.tables) {
    parsed.format.tables.forEach((table, tableIndex) => {
      if (table.columns) {
        table.columns.forEach(column => {
          if (column.name && column.dataType) {
            // データ型を適切に変換
            let type = 'string';
            if (column.dataType === 'float' || column.dataType === 'int') {
              type = 'number';
            } else if (column.dataType === 'date') {
              type = 'date';
            }
            
            fields.push({
              id: column.columnID || column.name.replace(/[^a-zA-Z0-9]/g, '_'),
              name: column.name,
              type: type,
              isTableColumn: true,  // テーブル項目であることを示すフラグ
              tableIndex: tableIndex
            });
          }
        });
      }
    });
  }
}
    
    console.log('抽出された項目:', fields);
    
    state.extractedFields = fields;
    updateUI();
    
  } catch (error) {
    console.error('JSON解析エラー:', error);
    alert('JSONの解析に失敗しました。正しいJSON形式か確認してください。');
  }
}

// カスタムフィールド追加
function addCustomField() {
  const nameInput = document.getElementById('newFieldName');
  const typeSelect = document.getElementById('newFieldType');
  
  if (nameInput.value.trim()) {
    const field = {
      id: nameInput.value.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
      name: nameInput.value,
      type: typeSelect.value
    };
    state.extractedFields.push(field);
    nameInput.value = '';
    state.showAddField = false;
    updateUI();
  }
}

// フィールド削除
function removeField(fieldId) {
  state.extractedFields = state.extractedFields.filter(f => f.id !== fieldId);
  state.selectedFields = state.selectedFields.filter(id => id !== fieldId);
  updateUI();
}

// フィールド選択トグル
function handleFieldToggle(fieldId) {
  if (state.selectedFields.includes(fieldId)) {
    state.selectedFields = state.selectedFields.filter(id => id !== fieldId);
  } else {
    state.selectedFields.push(fieldId);
  }
  updateUI();
}

// テンプレート適用（一時的に無効化）
function applyTemplate(templateKey) {
  console.log('テンプレート適用:', templateKey);
  alert('テンプレート機能は準備中です');
  return;
}

// プレビュー表示
function showPreview() {
  if (state.selectedFields.length === 0) return;
  
  state.showPreview = true;
  updateUI();
  renderChart();
}

// チャート描画
function renderChart() {
  const container = document.getElementById('chartContainer');
  container.innerHTML = '<div class="text-center p-8 text-gray-600">チャート機能は準備中です</div>';
  
  // タイトル更新
  const chartTypeNames = {
    bar: '棒グラフ',
    line: '折れ線グラフ',
    pie: '円グラフ',
    composed: '複合グラフ',
    table: '表'
  };
  document.getElementById('previewTitle').textContent = 'プレビュー - ' + chartTypeNames[state.chartType];
}

// パターン保存
function saveCurrentPattern() {
  if (!state.projectName.trim()) {
    alert('プロジェクト名を入力してください');
    return;
  }

  const patternName = prompt('パターン名を入力してください', 'パターン' + (state.patterns.length + 1));
  if (patternName) {
    const newPattern = {
      id: Date.now().toString(),
      name: patternName,
      selectedFields: [...state.selectedFields],
      chartType: state.chartType,
      memo: state.memo,
      alertSettings: {...state.alertSettings},
      timestamp: new Date().toLocaleString('ja-JP'),
      chartImage: null
    };
    
    state.patterns.push(newPattern);
    saveProjectWithPatterns(state.patterns);
    updateUI();
  }
}

// プロジェクト保存
function saveProjectWithPatterns(currentPatterns) {
  const projectData = {
    id: state.projectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
    name: state.projectName,
    jsonData: state.jsonData,
    extractedFields: state.extractedFields,
    patterns: currentPatterns,
    savedAt: new Date().toLocaleString('ja-JP'),
    lastModified: new Date().toLocaleString('ja-JP')
  };

  const existingIndex = state.savedProjects.findIndex(p => p.id === projectData.id);
  if (existingIndex >= 0) {
    state.savedProjects[existingIndex] = projectData;
  } else {
    state.savedProjects.push(projectData);
  }
  
  saveToLocalStorage();
}

// 新規プロジェクト開始
function startNewProject() {
  const hasUnsavedWork = state.selectedFields.length > 0 || state.memo.trim() || Object.keys(state.alertSettings).length > 0;
  
  if (hasUnsavedWork && state.projectName.trim()) {
    const shouldSave = window.confirm(
      `現在の作業内容をプロジェクト「${state.projectName}」に保存してからリセットしますか？\n\n` +
      `「OK」: 保存してリセット\n「キャンセル」: リセットせずに作業を続ける`
    );
    
    if (!shouldSave) {
      return;
    }
    
    if (state.selectedFields.length > 0) {
      const tempPatternName = '作業中パターン_' + new Date().toLocaleTimeString('ja-JP');
      const tempPattern = {
        id: Date.now().toString(),
        name: tempPatternName,
        selectedFields: [...state.selectedFields],
        chartType: state.chartType,
        memo: state.memo,
        alertSettings: {...state.alertSettings},
        timestamp: new Date().toLocaleString('ja-JP'),
        chartImage: null
      };
      
      const finalPatterns = [...state.patterns, tempPattern];
      saveProjectWithPatterns(finalPatterns);
    } else if (state.patterns.length > 0) {
      saveProjectWithPatterns(state.patterns);
    }
  }
  
  // リセット
  state = {
    jsonData: '',
    extractedFields: [],
    selectedFields: [],
    chartType: 'bar',
    showPreview: false,
    isExtracting: false,
    showAddField: false,
    newField: { name: '', type: 'number' },
    memo: '',
    isExporting: false,
    patterns: [],
    currentPattern: 0,
    projectName: '',
    alertSettings: {},
    showAlertSettings: false,
    savedProjects: state.savedProjects, // プロジェクト履歴は保持
    currentView: 'home',
    selectedProject: null
  };
  
  updateUI();
  alert('新しいプロジェクトを開始できます');
}

// エクスポート
async function exportChartWithMemo() {
  state.isExporting = true;
  document.getElementById('exportBtn').disabled = true;
  
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1200;
    canvas.height = 1600;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // ヘッダー
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    const chartTypeNames = {
      bar: '棒グラフ',
      line: '折れ線グラフ',
      pie: '円グラフ',
      composed: '複合グラフ',
      table: '表'
    };
    const chartTypeName = chartTypeNames[state.chartType];
    
    ctx.fillText('データ可視化 - ' + chartTypeName, canvas.width / 2, 40);
    
    if (state.projectName) {
      ctx.font = '16px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.fillText('プロジェクト: ' + state.projectName, canvas.width / 2, 70);
    }
    
    // 選択項目
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1f2937';
    ctx.fillText('選択項目:', 50, 100);
    
    let yPos = 120;
    state.selectedFields.forEach((field) => {
      const fieldInfo = state.extractedFields.find(f => f.id === field);
      if (fieldInfo) {
        ctx.fillText('• ' + fieldInfo.name + ' (' + fieldInfo.type + ')', 70, yPos);
        yPos += 25;
      }
    });
    
    // チャートエリア
    const chartStartY = yPos + 20;
    const chartHeight = 400;
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.strokeRect(50, chartStartY, canvas.width - 100, chartHeight);
    
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(51, chartStartY + 1, canvas.width - 102, chartHeight - 2);
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('チャートエリア', canvas.width / 2, chartStartY + chartHeight / 2);
    ctx.fillText('(' + chartTypeName + ')', canvas.width / 2, chartStartY + chartHeight / 2 + 30);
    
    // メモセクション
    const memoStartY = chartStartY + chartHeight + 40;
    
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('メモ・要望:', 50, memoStartY);
    
    const memoBoxHeight = 200;
    ctx.strokeStyle = '#d1d5db';
    ctx.strokeRect(50, memoStartY + 10, canvas.width - 100, memoBoxHeight);
    
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(51, memoStartY + 11, canvas.width - 102, memoBoxHeight - 2);
    
    // メモテキスト
    ctx.fillStyle = '#374151';
    ctx.font = '14px Arial';
    const memoLines = state.memo.split('\n');
    let memoY = memoStartY + 35;
    
    memoLines.forEach(line => {
      ctx.fillText(line, 70, memoY);
      memoY += 20;
    });
    
    // フッター
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    const now = new Date();
    const dateStr = now.toLocaleDateString('ja-JP') + ' ' + now.toLocaleTimeString('ja-JP');
    ctx.fillText('作成日時: ' + dateStr, canvas.width / 2, canvas.height - 20);
    
    // ダウンロード
    const link = document.createElement('a');
    const fileName = (state.projectName ? state.projectName + '_' : '') + 'データ可視化_' + chartTypeName + '_' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '.png';
    link.download = fileName;
    link.href = canvas.toDataURL();
    link.click();
    
  } catch (error) {
    console.error('エクスポートエラー:', error);
    alert('エクスポートに失敗しました');
  }
  
  state.isExporting = false;
  document.getElementById('exportBtn').disabled = false;
}

// 異常値設定
function setAlert(fieldId, min, max) {
  if (!state.alertSettings[fieldId]) {
    state.alertSettings[fieldId] = {};
  }
  state.alertSettings[fieldId].min = min ? parseFloat(min) : null;
  state.alertSettings[fieldId].max = max ? parseFloat(max) : null;
}

// UI更新
function updateUI() {
  // プロジェクト名
  document.getElementById('projectName').value = state.projectName;
  
  // パターン数
  if (state.patterns.length > 0) {
    document.getElementById('patternCount').classList.remove('hidden');
    document.getElementById('patternCountNum').textContent = state.patterns.length;
  } else {
    document.getElementById('patternCount').classList.add('hidden');
  }
  
  // JSONテキストエリア
  document.getElementById('jsonTextarea').value = state.jsonData;
  
  // テンプレートセクション
  if (state.extractedFields.length > 0) {
    document.getElementById('templateSection').classList.remove('hidden');
    document.getElementById('fieldsSection').classList.remove('hidden');
  } else {
    document.getElementById('templateSection').classList.add('hidden');
    document.getElementById('fieldsSection').classList.add('hidden');
  }
  
  // フィールドリスト
  updateFieldsList();
  
  // チャートタイプボタン
  updateChartTypeButtons();
  
  // メモ
  document.getElementById('memoTextarea').value = state.memo;
  
  // プレビューボタン
  document.getElementById('previewBtn').disabled = state.selectedFields.length === 0;
  document.getElementById('savePatternBtn').disabled = state.selectedFields.length === 0;
  
  // プレビューセクション
  if (state.showPreview && state.selectedFields.length > 0) {
    document.getElementById('previewSection').classList.remove('hidden');
    updateSelectedFieldsList();
  } else {
    document.getElementById('previewSection').classList.add('hidden');
  }
  
  // 項目追加フォーム
  updateAddFieldForm();
  
  // 異常値設定
  updateAlertSettings();
  
  // アイコンの再描画
  lucide.createIcons();
}

// フィールドリスト更新
function updateFieldsList() {
  const container = document.getElementById('fieldsList');
  container.innerHTML = '';
  
  state.extractedFields.forEach(field => {
    const div = document.createElement('div');
    div.className = 'field-item';
    div.innerHTML = `
      <label class="field-label">
        <input type="checkbox" class="field-checkbox" ${state.selectedFields.includes(field.id) ? 'checked' : ''} data-field-id="${field.id}">
        <div class="flex-1">
          <span class="text-sm font-medium">${field.name}</span>
          <span class="field-type">${field.type}</span>
          ${state.alertSettings[field.id] ? '<i data-lucide="alert-triangle" class="inline h-3 w-3 ml-1 text-orange-500"></i>' : ''}
        </div>
      </label>
      <button class="field-remove" data-field-id="${field.id}">
        <i data-lucide="x" class="h-4 w-4"></i>
      </button>
    `;
    container.appendChild(div);
  });
  
  // イベントリスナー追加
  container.querySelectorAll('.field-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      handleFieldToggle(e.target.dataset.fieldId);
    });
  });
  
  container.querySelectorAll('.field-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      removeField(e.currentTarget.dataset.fieldId);
    });
  });
}

// チャートタイプボタン更新
function updateChartTypeButtons() {
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    if (btn.dataset.type === state.chartType) {
      btn.classList.add('active', 'border-blue-500', 'bg-blue-50', 'text-blue-700');
      btn.classList.remove('border-gray-300', 'hover:border-gray-400');
    } else {
      btn.classList.remove('active', 'border-blue-500', 'bg-blue-50', 'text-blue-700');
      btn.classList.add('border-gray-300', 'hover:border-gray-400');
    }
  });
}

// 選択項目リスト更新
function updateSelectedFieldsList() {
  const container = document.getElementById('selectedFieldsList');
  container.innerHTML = '';
  
  state.selectedFields.forEach(fieldId => {
    const fieldInfo = state.extractedFields.find(f => f.id === fieldId);
    if (fieldInfo) {
      const hasAlert = state.alertSettings[fieldId];
      const span = document.createElement('span');
      span.className = hasAlert ? 'selected-field-badge alert' : 'selected-field-badge normal';
      span.innerHTML = fieldInfo.name + (hasAlert ? ' <i data-lucide="alert-triangle" class="inline h-3 w-3 ml-1"></i>' : '');
      container.appendChild(span);
    }
  });
  
  // 異常値警告
  if (Object.keys(state.alertSettings).length > 0) {
    document.getElementById('alertWarning').classList.remove('hidden');
  } else {
    document.getElementById('alertWarning').classList.add('hidden');
  }
}

// 項目追加フォーム更新
function updateAddFieldForm() {
  const form = document.getElementById('addFieldForm');
  if (state.showAddField) {
    form.classList.remove('hidden');
  } else {
    form.classList.add('hidden');
  }
}

// 異常値設定更新
function updateAlertSettings() {
  const panel = document.getElementById('alertSettingsPanel');
  const list = document.getElementById('alertSettingsList');
  
  if (state.showAlertSettings) {
    panel.classList.remove('hidden');
    
    // 数値項目のみ表示
    list.innerHTML = '';
    state.extractedFields.filter(f => f.type === 'number').forEach(field => {
      const div = document.createElement('div');
      div.className = 'alert-setting-row';
      const alert = state.alertSettings[field.id] || {};
      div.innerHTML = `
        <span class="alert-setting-label">${field.name}:</span>
        <input type="number" placeholder="下限値" class="alert-input" value="${alert.min || ''}" data-field-id="${field.id}" data-type="min">
        <span class="text-gray-800">〜</span>
        <input type="number" placeholder="上限値" class="alert-input" value="${alert.max || ''}" data-field-id="${field.id}" data-type="max">
      `;
      list.appendChild(div);
    });
    
    // イベントリスナー
    list.querySelectorAll('.alert-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const fieldId = e.target.dataset.fieldId;
        const type = e.target.dataset.type;
        const current = state.alertSettings[fieldId] || {};
        if (type === 'min') {
          setAlert(fieldId, e.target.value, current.max);
        } else {
          setAlert(fieldId, current.min, e.target.value);
        }
      });
    });
  } else {
    panel.classList.add('hidden');
  }
}

// プロジェクト履歴更新
function updateProjectsList() {
  const container = document.getElementById('projectsList');
  const noProjectsMessage = document.getElementById('noProjectsMessage');
  
  if (state.savedProjects.length === 0) {
    noProjectsMessage.classList.remove('hidden');
    container.innerHTML = '';
  } else {
    noProjectsMessage.classList.add('hidden');
    container.innerHTML = '';
    
    state.savedProjects.forEach(project => {
      const div = document.createElement('div');
      div.className = 'bg-white rounded-xl shadow-lg p-6';
      div.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-xl font-semibold text-gray-800">${project.name}</h3>
            <p class="text-gray-800 text-sm">
              作成: ${project.savedAt} | 最終更新: ${project.lastModified}
            </p>
            <p class="text-gray-900 text-sm mt-1">
              パターン数: ${project.patterns.length}個
            </p>
          </div>
        </div>
        ${project.patterns.length > 0 ? `
          <div class="space-y-3">
            <h4 class="font-medium text-gray-900">保存されたパターン:</h4>
            <div class="grid gap-3">
              ${project.patterns.map(pattern => `
                <div class="flex gap-4 p-3 bg-gray-50 rounded-lg">
                  <div class="flex-shrink-0">
                    <div class="w-24 h-20 bg-gray-200 border border-gray-300 rounded flex items-center justify-center">
                      <span class="text-xs text-gray-500 text-center">画像なし</span>
                    </div>
                  </div>
                  <div class="flex-1">
                    <h5 class="font-medium text-gray-800">${pattern.name}</h5>
                    <p class="text-sm text-gray-900">
                      ${pattern.chartType === 'bar' ? '棒グラフ' :
                        pattern.chartType === 'line' ? '折れ線グラフ' :
                        pattern.chartType === 'pie' ? '円グラフ' :
                        pattern.chartType === 'composed' ? '複合グラフ' :
                        '表'} | ${pattern.timestamp}
                    </p>
                    ${pattern.memo ? `<p class="text-sm text-gray-800 mt-1 line-clamp-2">メモ: ${pattern.memo}</p>` : ''}
                  </div>
                  <div class="flex flex-col gap-2">
                    <button onclick="alert('プレビュー機能は準備中です')" class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                      拡大
                    </button>
                    <button onclick="alert('ダウンロード機能は準備中です')" class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors">
                      DL
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      `;
      container.appendChild(div);
    });
  }
  
  // アイコンの再描画
  lucide.createIcons();
}

// localStorage操作
function saveToLocalStorage() {
  const data = {
    state: state,
    version: '1.0'
  };
  localStorage.setItem('genba-visualization-app', JSON.stringify(data));
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem('genba-visualization-app');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.state) {
        // savedProjectsだけ復元（作業中のデータは復元しない）
        state.savedProjects = data.state.savedProjects || [];
      }
    } catch (error) {
      console.error('データの読み込みエラー:', error);
    }
  }
}
