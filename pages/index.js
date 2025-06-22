'use client';

import React, { useState, useRef, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Upload, FileText, BarChart3, TrendingUp, Download, Eye, Activity, Grid3X3, Plus, X, Edit3, FileJson, Copy, Folder, AlertTriangle, Settings, Zap, Home, History, RefreshCw } from 'lucide-react';

export default function ChartGeneratorApp() {
  const [jsonData, setJsonData] = useState('');
  const [extractedFields, setExtractedFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [chartType, setChartType] = useState('bar');
  const [showPreview, setShowPreview] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState({ name: '', type: 'number' });
  const [memo, setMemo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  // 新機能のstate
  const [patterns, setPatterns] = useState([]);
  const [currentPattern, setCurrentPattern] = useState(0);
  const [projectName, setProjectName] = useState('');
  const [alertSettings, setAlertSettings] = useState({});
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [savedProjects, setSavedProjects] = useState([]);
  const [currentView, setCurrentView] = useState('home'); // 'home' or 'history'
  const [selectedProject, setSelectedProject] = useState(null);
  
  const jsonInputRef = useRef(null);

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

  const handleJsonFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setJsonData(e.target.result);
        extractFieldsFromJson(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const extractFieldsFromJson = (jsonString) => {
    setIsExtracting(true);
    try {
      const parsed = JSON.parse(jsonString);
      const fields = [];
      
      // ミライのゲンバ帳票形式の場合
      if (parsed.format && parsed.format.boxes) {
        // boxesから項目を抽出
        parsed.format.boxes.forEach(box => {
          if (box.name && box.dataType) {
            let type = inferDataType(box.name, box.dataType);
            
            fields.push({
              id: box.fieldID || box.name.replace(/[^a-zA-Z0-9]/g, '_'),
              name: box.name,
              type: type
            });
          }
        });
        
        // tablesからカラム項目を抽出
        if (parsed.format.tables) {
          parsed.format.tables.forEach(table => {
            if (table.columns) {
              table.columns.forEach(column => {
                if (column.name && column.dataType) {
                  let type = inferDataType(column.name, column.dataType);
                  
                  fields.push({
                    id: column.columnID || column.name.replace(/[^a-zA-Z0-9]/g, '_'),
                    name: column.name,
                    type: type
                  });
                }
              });
            }
          });
        }
      } else {
        // 通常のJSON形式の場合
        const extractFields = (obj, prefix = '') => {
          Object.keys(obj).forEach(key => {
            const fullKey = prefix ? prefix + '.' + key : key;
            const value = obj[key];
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              extractFields(value, fullKey);
            } else {
              let type = inferDataType(key, typeof value === 'number' ? 'number' : 'string');
              
              fields.push({
                id: fullKey.replace(/[^a-zA-Z0-9]/g, '_'),
                name: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
                type: type
              });
            }
          });
        };
        
        extractFields(parsed);
      }
      
      setExtractedFields(fields);
      setIsExtracting(false);
    } catch (error) {
      console.error('JSON解析エラー:', error);
      setIsExtracting(false);
    }
  };

  // データ型推定の強化
  const inferDataType = (fieldName, originalType) => {
    const name = fieldName.toLowerCase();
    
    // 製造業特有の数値項目
    const numericKeywords = ['spm', 'ピッチ', '温度', '湿度', '数', '率', 'ハイト', 'ショット', '重', '効率', 'スコア'];
    const dateKeywords = ['日', 'date', 'time', '時'];
    
    if (numericKeywords.some(keyword => name.includes(keyword))) {
      return 'number';
    }
    if (dateKeywords.some(keyword => name.includes(keyword))) {
      return 'date';
    }
    
    // 元の型に基づく判定
    switch (originalType) {
      case 'int':
      case 'float':
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      default:
        return 'string';
    }
  };

  const handleJsonTextChange = (value) => {
    setJsonData(value);
    if (value.trim()) {
      extractFieldsFromJson(value);
    }
  };

  const addCustomField = () => {
    if (newField.name.trim()) {
      const field = {
        id: newField.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
        name: newField.name,
        type: newField.type
      };
      setExtractedFields(prev => [...prev, field]);
      setNewField({ name: '', type: 'number' });
      setShowAddField(false);
    }
  };

  const removeField = (fieldId) => {
    setExtractedFields(prev => prev.filter(f => f.id !== fieldId));
    setSelectedFields(prev => prev.filter(id => id !== fieldId));
  };

  const handleFieldToggle = (fieldId) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  // 提案テンプレート適用
  const applyTemplate = (templateKey) => {
    const template = proposalTemplates[templateKey];
    const matchedFields = extractedFields.filter(field => 
      template.preferredFields.some(keyword => 
        field.name.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    let selectedFieldIds = [];
    
    if (matchedFields.length > 0) {
      // X軸用の日付項目を探す
      const dateField = extractedFields.find(field => 
        field.type === 'date' || 
        field.name.toLowerCase().includes('日') ||
        field.name.toLowerCase().includes('date') ||
        field.name.toLowerCase().includes('time')
      );
      
      if (dateField && !matchedFields.includes(dateField)) {
        // 日付項目をX軸として最初に追加
        selectedFieldIds = [dateField.id, ...matchedFields.map(f => f.id)];
      } else if (dateField) {
        // 日付項目が既にマッチしている場合、それを最初に
        const otherFields = matchedFields.filter(f => f.id !== dateField.id);
        selectedFieldIds = [dateField.id, ...otherFields.map(f => f.id)];
      } else {
        // 日付項目がない場合、ダミー日付項目を作成
        const dummyDateField = {
          id: 'dummy_date',
          name: '作業日（サンプル）',
          type: 'date'
        };
        setExtractedFields(prev => [dummyDateField, ...prev]);
        selectedFieldIds = [dummyDateField.id, ...matchedFields.map(f => f.id)];
      }
      
      setSelectedFields(selectedFieldIds);
      setChartType(template.chartType);
      setMemo(template.memo);
    } else {
      // マッチする項目がない場合、ダミー項目を作成
      const dummyDateField = {
        id: 'dummy_date',
        name: '作業日（サンプル）',
        type: 'date'
      };
      
      const dummyFields = template.preferredFields.slice(0, 3).map((name, index) => ({
        id: 'dummy_' + name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'),
        name: name + '（サンプル）',
        type: 'number'
      }));
      
      const allDummyFields = [dummyDateField, ...dummyFields];
      setExtractedFields(prev => [...prev, ...allDummyFields]);
      setSelectedFields(allDummyFields.map(f => f.id));
      setChartType(template.chartType);
      setMemo(template.memo);
    }
    
    setShowPreview(true);
  };

  // チャート画像生成（パターン保存用）
  const generateChartImageForSave = async () => {
    return new Promise((resolve) => {
      // 実際のチャートのSVG要素を取得
      const chartContainer = document.querySelector('.recharts-wrapper svg');
      
      if (!chartContainer) {
        // チャートが見つからない場合はダミー画像を生成
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 300;
        
        // 背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // テキスト
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        const chartTypeName = {
          bar: '棒グラフ',
          line: '折れ線グラフ',
          pie: '円グラフ',
          composed: '複合グラフ',
          table: '表'
        }[chartType] || 'グラフ';
        
        ctx.fillText(chartTypeName, canvas.width / 2, canvas.height / 2);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#6b7280';
        ctx.fillText(new Date().toLocaleString('ja-JP'), canvas.width / 2, canvas.height / 2 + 30);
        
        resolve(canvas.toDataURL());
        return;
      }

      // SVGをcanvasに変換
      const svgData = new XMLSerializer().serializeToString(chartContainer);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 400;
      canvas.height = 300;
      
      const img = new Image();
      img.onload = function() {
        // 背景を白で塗りつぶし
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // SVG画像を描画（縦横比を保ちながらリサイズ）
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        resolve(canvas.toDataURL());
      };
      
      img.onerror = function() {
        // エラーの場合はダミー画像
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('グラフ画像', canvas.width / 2, canvas.height / 2);
        resolve(canvas.toDataURL());
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
  };

  // パターン保存（プロジェクトに自動保存）
  const saveCurrentPattern = async () => {  
    if (!projectName.trim()) {
      alert('プロジェクト名を入力してください');
      return;
    }

    const patternName = prompt('パターン名を入力してください', 'パターン' + (patterns.length + 1));
    if (patternName) {
      // チャート画像を生成
      const chartImage = await generateChartImageForSave();
      
      const newPattern = {
        id: Date.now().toString(),
        name: patternName,
        selectedFields: [...selectedFields],
        chartType: chartType,
        memo: memo,
        alertSettings: {...alertSettings},
        timestamp: new Date().toLocaleString('ja-JP'),
        chartImage: chartImage,  // 生成した画像を保存
      };
      
      // 現在のパターンリストに追加
      const updatedPatterns = [...patterns, newPattern];
      setPatterns(updatedPatterns);
      
      // プロジェクトを自動保存/更新
      saveProjectWithPatterns(updatedPatterns);
    }
  };

  // プロジェクト保存/更新
  const saveProjectWithPatterns = (currentPatterns) => {
    const projectData = {
      id: projectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
      name: projectName,
      jsonData: jsonData,
      extractedFields: extractedFields,
      patterns: currentPatterns,
      savedAt: new Date().toLocaleString('ja-JP'),
      lastModified: new Date().toLocaleString('ja-JP')
    };

    setSavedProjects(prev => {
      // 既存プロジェクトを更新または新規追加
      const existingIndex = prev.findIndex(p => p.id === projectData.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = projectData;
        return updated;
      } else {
        return [...prev, projectData];
      }
    });
  };

  // 安全なリセット機能
  const startNewProject = () => {
    // 未保存の作業があるかチェック
    const hasUnsavedWork = selectedFields.length > 0 || memo.trim() || Object.keys(alertSettings).length > 0;
    
    if (hasUnsavedWork && projectName.trim()) {
      const shouldSave = window.confirm(
        `現在の作業内容をプロジェクト「${projectName}」に保存してからリセットしますか？\n\n` +
        `「OK」: 保存してリセット\n「キャンセル」: リセットせずに作業を続ける`
      );
      
      if (!shouldSave) {
        return; // キャンセルされた場合は何もしない
      }
      
      // 未保存のパターンがある場合は保存
      if (selectedFields.length > 0) {
        const tempPatternName = '作業中パターン_' + new Date().toLocaleTimeString('ja-JP');
        const tempPattern = {
          id: Date.now().toString(),
          name: tempPatternName,
          selectedFields: [...selectedFields],
          chartType: chartType,
          memo: memo,
          alertSettings: {...alertSettings},
          timestamp: new Date().toLocaleString('ja-JP'),
          exportedImage: null
        };
        
        const finalPatterns = [...patterns, tempPattern];
        saveProjectWithPatterns(finalPatterns);
      } else if (patterns.length > 0) {
        // パターンはあるが現在の作業はない場合
        saveProjectWithPatterns(patterns);
      }
    }
    
    // 画面を完全リセット
    setProjectName('');
    setJsonData('');
    setExtractedFields([]);
    setSelectedFields([]);
    setPatterns([]);
    setChartType('bar');
    setMemo('');
    setAlertSettings({});
    setShowPreview(false);
    setShowAddField(false);
    setShowAlertSettings(false);
    setIsExtracting(false);
    
    alert('新しいプロジェクトを開始できます');
  };

  // プロジェクト履歴から選択
  const selectProject = (project) => {
    setSelectedProject(project);
  };

  // プロジェクト履歴でパターンプレビュー（拡大表示）
  const previewPattern = (pattern) => {
    if (pattern.chartImage) {
      // 新しいウィンドウでチャート画像を拡大表示
      const newWindow = window.open('', '_blank');
      newWindow.document.write(`
        <html>
          <head><title>${pattern.name} - 拡大プレビュー</title></head>
          <body style="margin: 0; padding: 20px; text-align: center; background: #f9fafb;">
            <h2>${pattern.name}</h2>
            <p>作成日時: ${pattern.timestamp}</p>
            <img src="${pattern.chartImage}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px;"/>
          </body>
        </html>
      `);
    } else {
      alert('チャート画像が保存されていません');
    }
  };

  // プロジェクト履歴でパターンダウンロード
  const downloadPattern = (projectName, pattern) => {
    // 簡易的なダウンロード機能
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${projectName} - ${pattern.name}`, canvas.width / 2, 50);
    
    ctx.font = '16px Arial';
    ctx.fillText(`作成日時: ${pattern.timestamp}`, canvas.width / 2, 80);
    ctx.fillText(`グラフタイプ: ${pattern.chartType}`, canvas.width / 2, 110);
    
    const link = document.createElement('a');
    link.download = `${projectName}_${pattern.name}_${new Date().toLocaleDateString('ja-JP')}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // 異常値設定
  const setAlert = (fieldId, min, max) => {
    setAlertSettings(prev => ({
      ...prev,
      [fieldId]: { min: parseFloat(min) || null, max: parseFloat(max) || null }
    }));
  };

  // 異常値判定
  const isAbnormal = (fieldId, value) => {
    const alert = alertSettings[fieldId];
    if (!alert) return false;
    if (alert.min !== null && value < alert.min) return true;
    if (alert.max !== null && value > alert.max) return true;
    return false;
  };

  const exportChartWithMemo = async () => {
    setIsExporting(true);
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 1200;
      canvas.height = 1600;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // ヘッダー（プロジェクト名追加）
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      const chartTypeName = {
        bar: '棒グラフ',
        line: '折れ線グラフ',
        pie: '円グラフ',
        composed: '複合グラフ',
        table: '表'
      }[chartType];
      
      ctx.fillText('データ可視化 - ' + chartTypeName, canvas.width / 2, 40);
      
      if (projectName) {
        ctx.font = '16px Arial';
        ctx.fillStyle = '#6b7280';
        ctx.fillText('プロジェクト: ' + projectName, canvas.width / 2, 70);
      }
      
      // 選択項目の表示
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1f2937';
      ctx.fillText('選択項目:', 50, 100);
      
      let yPos = 120;
      selectedFields.forEach((field) => {
        const fieldInfo = extractedFields.find(f => f.id === field);
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
      const memoLines = memo.split('\n');
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
      const fileName = (projectName ? projectName + '_' : '') + 'データ可視化_' + chartTypeName + '_' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '.png';
      link.download = fileName;
      link.href = canvas.toDataURL();
      link.click();
      
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポートに失敗しました');
    }
    
    setIsExporting(false);
  };

  // ダミーデータ生成（useMemoで最適化）
  const dummyData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 30; i++) {
      const row = {};
      extractedFields.forEach(field => {
        switch (field.type) {
          case 'date':
            row[field.id] = '2024-' + String(Math.floor(i/30) + 1).padStart(2, '0') + '-' + String((i % 30) + 1).padStart(2, '0');
            break;
          case 'number':
            if (field.name.includes('温度')) {
              row[field.id] = Math.floor(Math.random() * 10) + 20;
            } else if (field.name.includes('湿度')) {
              row[field.id] = Math.floor(Math.random() * 20) + 40;
            } else if (field.name.includes('生産')) {
              row[field.id] = Math.floor(Math.random() * 50) + 100;
            } else if (field.name.includes('不良')) {
              row[field.id] = Math.floor(Math.random() * 10);
            } else if (field.name.includes('SPM')) {
              row[field.id] = Math.floor(Math.random() * 50) + 100;
            } else if (field.name.includes('ショット')) {
              row[field.id] = Math.floor(Math.random() * 1000) + 5000;
            } else {
              row[field.id] = Math.floor(Math.random() * 100);
            }
            break;
          case 'string':
            if (field.name.includes('作業者') || field.name.includes('worker')) {
              const workers = ['田中', '佐藤', '鈴木', '高橋', '渡邊'];
              row[field.id] = workers[Math.floor(Math.random() * workers.length)];
            } else if (field.name.includes('機械') || field.name.includes('machine')) {
              row[field.id] = 'M' + String(Math.floor(Math.random() * 5) + 1).padStart(3, '0');
            } else {
              row[field.id] = 'データ' + (i + 1);
            }
            break;
          default:
            row[field.id] = '値' + (i + 1);
        }
      });
      data.push(row);
    }
    return data;
  }, [extractedFields]);

  const renderChart = () => {
    if (selectedFields.length === 0) return null;

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

    // 異常値用のカスタムTooltip
    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
            <p className="font-medium">{label}</p>
            {payload.map((entry, index) => {
              const isAbnormalValue = isAbnormal(entry.dataKey, entry.value);
              return (
                <p key={index} style={{ color: entry.color }} className={isAbnormalValue ? 'font-bold' : ''}>
                  {entry.name}: {entry.value}
                  {isAbnormalValue && <span className="text-red-500 ml-2">⚠️異常値</span>}
                </p>
              );
            })}
          </div>
        );
      }
      return null;
    };

    // 異常値の色を変更するためのBar/Lineコンポーネント
    const renderBarWithAlerts = (field, index) => {
      const fieldInfo = extractedFields.find(f => f.id === field);
      if (fieldInfo?.type === 'number') {
        return (
          <Bar 
            key={field} 
            dataKey={field} 
            fill={colors[index % colors.length]} 
            name={fieldInfo.name}
          />
        );
      }
      return null;
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dummyData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedFields[0]} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {selectedFields.slice(1).map(renderBarWithAlerts)}
              {/* 異常値の参照線 */}
              {selectedFields.slice(1).map((field, index) => {
                const alert = alertSettings[field];
                if (alert) {
                  return (
                    <React.Fragment key={field + '_alert'}>
                      {alert.max !== null && (
                        <ReferenceLine y={alert.max} stroke="red" strokeDasharray="5 5" label="上限" />
                      )}
                      {alert.min !== null && (
                        <ReferenceLine y={alert.min} stroke="red" strokeDasharray="5 5" label="下限" />
                      )}
                    </React.Fragment>
                  );
                }
                return null;
              })}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dummyData.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedFields[0]} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {selectedFields.slice(1).map((field, index) => {
                const fieldInfo = extractedFields.find(f => f.id === field);
                if (fieldInfo?.type === 'number') {
                  return <Line key={field} type="monotone" dataKey={field} stroke={colors[index % colors.length]} name={fieldInfo.name} />;
                }
                return null;
              })}
              {/* 異常値の参照線 */}
              {selectedFields.slice(1).map((field, index) => {
                const alert = alertSettings[field];
                if (alert) {
                  return (
                    <React.Fragment key={field + '_alert'}>
                      {alert.max !== null && (
                        <ReferenceLine y={alert.max} stroke="red" strokeDasharray="5 5" label="上限" />
                      )}
                      {alert.min !== null && (
                        <ReferenceLine y={alert.min} stroke="red" strokeDasharray="5 5" label="下限" />
                      )}
                    </React.Fragment>
                  );
                }
                return null;
              })}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieField = selectedFields.find(field => {
          const fieldInfo = extractedFields.find(f => f.id === field);
          return fieldInfo?.type === 'string';
        });
        
        if (!pieField) return <div className="text-gray-800">円グラフには文字列項目を選択してください</div>;
        
        const pieData = dummyData.reduce((acc, item) => {
          const key = item[pieField];
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        
        const pieChartData = Object.entries(pieData).map(([name, value]) => ({ name, value }));
        
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={'cell-' + index} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={dummyData.slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedFields[0]} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {selectedFields.slice(1).map((field, index) => {
                const fieldInfo = extractedFields.find(f => f.id === field);
                if (fieldInfo?.type === 'number') {
                  if (index % 2 === 0) {
                    return <Bar key={field} dataKey={field} fill={colors[index % colors.length]} name={fieldInfo.name} />;
                  } else {
                    return <Line key={field} type="monotone" dataKey={field} stroke={colors[index % colors.length]} name={fieldInfo.name} />;
                  }
                }
                return null;
              })}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  {selectedFields.map(field => {
                    const fieldInfo = extractedFields.find(f => f.id === field);
                    return (
                      <th key={field} className="border border-gray-300 px-4 py-2 text-left font-medium">
                        {fieldInfo?.name}
                        {alertSettings[field] && <AlertTriangle className="inline h-4 w-4 ml-1 text-red-500" />}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {dummyData.slice(0, 10).map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {selectedFields.map(field => {
                      const value = row[field];
                      const isAbnormalValue = isAbnormal(field, value);
                      return (
                        <td 
                          key={field} 
                          className={'border border-gray-300 px-4 py-2' + (isAbnormalValue ? ' bg-red-100 text-red-700 font-bold' : '')}
                        >
                          {value}
                          {isAbnormalValue && <span className="ml-2">⚠️</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            帳票データ可視化アプリケーション
          </h1>
          <p className="text-gray-900">
            JSONデータから自動で項目を抽出し、お客様とのすり合わせ用グラフ・表を生成
          </p>
          
          {/* ナビゲーション */}
<div className="flex justify-center gap-4 mt-6">
            <button
              onClick={() => setCurrentView('home')}
              className={`nav-button ${currentView === 'home' ? 'active' : ''}`}
            >
              <Home className="h-5 w-5 mr-2" />
              ホーム
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`nav-button ${currentView === 'history' ? 'active' : ''}`}
            >
              <History className="h-5 w-5 mr-2" />
              プロジェクト履歴
            </button>
          </div>
        </header>

        {currentView === 'home' ? (
          // ホーム画面
          <div className="space-y-8">
            {/* プロジェクト管理エリア */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="project-header">
                <h2 className="text-xl font-semibold flex items-center">
                  <Folder className="mr-2" />
                  <span className="text-gray-900">プロジェクト管理</span>
                </h2>
                <button
                  onClick={startNewProject}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  新しいプロジェクトを開始
                </button>
              </div>
              <div className="flex gap-4 items-center">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="プロジェクト名を入力（例: A社_品質改善_2024）"
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {patterns.length > 0 && (
                  <div className="text-sm text-gray-900">
                    保存済みパターン: {patterns.length}個
                  </div>
                )}
              </div>
            </div>

            {/* JSONデータ取り込み */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-8 json-file-section">
                <h2 className="text-xl font-semibold mb-6 flex items-center justify-center">
                  <FileJson className="mr-2" />
                  JSONデータ取り込み
                </h2>
                <div className="space-y-4">
                  <button
                    onClick={() => jsonInputRef.current?.click()}
                    className="file-input-label w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    JSONファイルを選択
                  </button>
                  <div className="text-center text-gray-800 text-sm">または</div>
                  <textarea
                    value={jsonData}
                    onChange={(e) => handleJsonTextChange(e.target.value)}
                    className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="JSONデータを直接入力してください..."
                  />
                </div>
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleJsonFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* 提案テンプレート */}
            {extractedFields.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Zap className="mr-2" />
                  提案テンプレート
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(proposalTemplates).map(([key, template]) => (
                    <div key={key} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                      <p className="text-gray-900 text-sm mb-3">{template.description}</p>
                      <button
                        onClick={() => applyTemplate(key)}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        このテンプレートを適用
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 抽出された項目と設定 */}
            {(extractedFields.length > 0 || isExtracting) && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Edit3 className="mr-2" />
                    抽出された項目
                    {isExtracting && <span className="ml-2 text-blue-600">解析中...</span>}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddField(!showAddField)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      項目追加
                    </button>
                    <button
                      onClick={() => setShowAlertSettings(!showAlertSettings)}
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      異常値設定
                    </button>
                  </div>
                </div>

                {/* 新規項目追加フォーム */}
                {showAddField && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">項目名</label>
                        <input
                          type="text"
                          value={newField.name}
                          onChange={(e) => setNewField({...newField, name: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="例: 作業効率, 検査回数"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">データ型</label>
                        <select
                          value={newField.type}
                          onChange={(e) => setNewField({...newField, type: e.target.value})}
                          className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="number">数値</option>
                          <option value="string">文字列</option>
                          <option value="date">日付</option>
                        </select>
                      </div>
                      <button
                        onClick={addCustomField}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                )}

                {/* 異常値設定パネル */}
                {showAlertSettings && (
                  <div className="mb-6 p-4 bg-orange-50 rounded-lg">
                    <h3 className="font-medium mb-3">異常値検知設定</h3>
                    <div className="space-y-3">
                      {extractedFields.filter(f => f.type === 'number').map(field => (
                        <div key={field.id} className="flex items-center gap-4">
                          <span className="w-32 text-sm font-medium">{field.name}:</span>
                          <input
                            type="number"
                            placeholder="下限値"
                            className="w-20 p-1 border border-gray-300 rounded text-sm"
                            onChange={(e) => setAlert(field.id, e.target.value, alertSettings[field.id]?.max)}
                          />
                          <span className="text-gray-800">〜</span>
                          <input
                            type="number"
                            placeholder="上限値"
                            className="w-20 p-1 border border-gray-300 rounded text-sm"
                            onChange={(e) => setAlert(field.id, alertSettings[field.id]?.min, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-2 bg-blue-100 rounded">
                      <p className="text-sm text-blue-800">
                        💡 ヒント: 異常値の参照線がグラフに表示されます
                      </p>
                    </div>
                  </div>
                )}

                {/* 項目リスト */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  {extractedFields.map(field => (
                    <div key={field.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <label className="flex items-center space-x-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field.id)}
                          onChange={() => handleFieldToggle(field.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{field.name}</span>
                          <span className="ml-2 text-xs text-gray-800 bg-gray-100 px-2 py-1 rounded">
                            {field.type}
                          </span>
                          {alertSettings[field.id] && (
                            <AlertTriangle className="inline h-3 w-3 ml-1 text-orange-500" />
                          )}
                        </div>
                      </label>
                      <button
                        onClick={() => removeField(field.id)}
                        className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* グラフタイプ選択 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">可視化タイプ選択</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { type: 'bar', icon: BarChart3, name: '棒グラフ' },
                      { type: 'line', icon: Activity, name: '折れ線グラフ' },
                      { type: 'pie', icon: TrendingUp, name: '円グラフ' },
                      { type: 'composed', icon: BarChart3, name: '複合グラフ' },
                      { type: 'table', icon: Grid3X3, name: '表' }
                    ].map(({ type, icon: Icon, name }) => (
                      <button
                        key={type}
                        onClick={() => setChartType(type)}
                        className={'p-3 rounded-lg border-2 transition-all ' + (
                          chartType === type
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 hover:border-gray-400'
                        )}
                      >
                        <Icon className="h-6 w-6 mx-auto mb-1" />
                        <div className="text-sm font-medium">{name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* メモエリア */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-3 flex items-center">
                    <Edit3 className="h-4 w-4 mr-2" />
                    お客様からの要望・メモ
                  </h3>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="お客様からの要望や気づいた点をメモしてください..."
                  />
                  <p className="text-sm text-gray-800 mt-2">
                    このメモも一緒に画像として出力されます
                  </p>
                </div>

                {/* プレビューボタン */}
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setShowPreview(true)}
                    disabled={selectedFields.length === 0}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Eye className="h-5 w-5" />
                    <span>プレビュー生成</span>
                  </button>
                  <button
                    onClick={saveCurrentPattern}
                    disabled={selectedFields.length === 0}
                    className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Copy className="h-5 w-5" />
                    <span>パターン保存</span>
                  </button>
                </div>
              </div>
            )}

            {/* プレビューエリア */}
            {showPreview && selectedFields.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    プレビュー - {
                      {
                        bar: '棒グラフ',
                        line: '折れ線グラフ',
                        pie: '円グラフ',
                        composed: '複合グラフ',
                        table: '表'
                      }[chartType]
                    }
                  </h2>
                  <button 
                    onClick={exportChartWithMemo}
                    disabled={isExporting}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>{isExporting ? 'エクスポート中...' : 'メモ付きエクスポート'}</span>
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  {renderChart()}
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">選択中の項目:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedFields.map(field => {
                      const fieldInfo = extractedFields.find(f => f.id === field);
                      const hasAlert = alertSettings[field];
                      return (
                        <span key={field} className={hasAlert ? 'bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm' : 'bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm'}>
                          {fieldInfo?.name}
                          {hasAlert && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                        </span>
                      );
                    })}
                  </div>
                  {Object.keys(alertSettings).length > 0 && (
                    <div className="mt-3 p-2 bg-orange-100 rounded">
                      <p className="text-sm text-orange-800">
                        <AlertTriangle className="inline h-4 w-4 mr-1" />
                        異常値監視が有効です。設定された閾値を超えた値は赤色で表示されます。
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // プロジェクト履歴画面
          <div className="space-y-6">
            {savedProjects.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">保存されたプロジェクトはありません</h3>
                <p className="text-gray-800">ホーム画面でプロジェクトを作成してパターンを保存してください</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {savedProjects.map(project => (
                  <div key={project.id} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">{project.name}</h3>
                        <p className="text-gray-800 text-sm">
                          作成: {project.savedAt} | 最終更新: {project.lastModified}
                        </p>
                        <p className="text-gray-900 text-sm mt-1">
                          パターン数: {project.patterns.length}個
                        </p>
                      </div>
                    </div>
                    
                    {project.patterns.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">保存されたパターン:</h4>
                        <div className="grid gap-3">
                          {project.patterns.map(pattern => (
                            <div key={pattern.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                              {/* グラフサムネイル表示 */}
                              <div className="flex-shrink-0">
                                {pattern.chartImage ? (
                                  <img 
                                    src={pattern.chartImage}
                                    alt={`${pattern.name}のグラフ`}
                                    className="w-24 h-20 object-cover border border-gray-300 rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => previewPattern(pattern)}
                                    title="クリックで拡大表示"
                                  />
                                ) : (
                                  <div className="w-24 h-20 bg-gray-200 border border-gray-300 rounded flex items-center justify-center">
                                    <span className="text-xs text-gray-500 text-center">画像なし</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* パターン情報 */}
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-800">{pattern.name}</h5>
                                <p className="text-sm text-gray-900">
                                  {pattern.chartType === 'bar' ? '棒グラフ' :
                                   pattern.chartType === 'line' ? '折れ線グラフ' :
                                   pattern.chartType === 'pie' ? '円グラフ' :
                                   pattern.chartType === 'composed' ? '複合グラフ' :
                                   '表'} | {pattern.timestamp}
                                </p>
                                {pattern.memo && (
                                  <p className="text-sm text-gray-800 mt-1 line-clamp-2">
                                    メモ: {pattern.memo}
                                  </p>
                                )}
                              </div>
                              
                              {/* アクションボタン */}
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => previewPattern(pattern)}
                                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                  title="拡大表示"
                                >
                                  拡大
                                </button>
                                <button
                                  onClick={() => downloadPattern(project.name, pattern)}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                                >
                                  DL
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
