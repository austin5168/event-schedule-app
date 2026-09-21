import React, { useState, useRef } from 'react';
import { 
  CalendarDays, Settings, Image as ImageIcon, FileText, 
  FileSpreadsheet, Plus, Trash2, ArrowUp, ArrowDown, 
  ChevronRight, Sparkles, PenBox, Clock 
} from 'lucide-react';

// --- 輔助函式 ---
const generateId = () => Math.random().toString(36).substr(2, 9);

// 時間加上指定分鐘數
const addMinutes = (timeStr, mins) => {
  if (!timeStr) return '00:00';
  const [h, m] = timeStr.split(':').map(Number);
  let totalMins = h * 60 + m + (Number(mins) || 0);
  if (totalMins < 0) totalMins = 0;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

// 取得特定天數的日期字串
const getSpecificDate = (startDateStr, dayOffset) => {
  if (!startDateStr) return { formatted: '', raw: '' };
  const d = new Date(startDateStr);
  d.setDate(d.getDate() + dayOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const w = weekdays[d.getDay()];
  return {
    formatted: `${y}年${m}月${day}日 (星期${w})`,
    raw: `${y}-${m}-${day}`
  };
};

export default function App() {
  const [isSetup, setIsSetup] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const exportContainerRef = useRef(null);

  // 專案基本設定
  const [project, setProject] = useState({
    name: '',
    days: 3,
    startDate: new Date().toISOString().split('T')[0]
  });
  
  // 目前切換的天數 (0 = Day 1)
  const [currentDay, setCurrentDay] = useState(0);
  
  // 記錄每一天的「初始開始時間」
  const [dailyStartTimes, setDailyStartTimes] = useState([]);
  
  // 記錄每一天的行程資料 (不存時間，只存 duration 分鐘數)
  const [schedules, setSchedules] = useState([]);

  // 初始化預設行程資料
  const initProjectData = (days) => {
    // 預設每天早上 08:00 開始
    setDailyStartTimes(Array(days).fill('08:00'));
    
    // 預設行程 (只包含時長 duration)
    const initialSchedules = Array.from({ length: days }, () => [
      { id: generateId(), duration: 30, title: '學員報到與集合', owner: '行政組', note: '發放名牌' },
      { id: generateId(), duration: 60, title: '開幕式與長官致詞', owner: '總召', note: '' },
      { id: generateId(), duration: 90, title: '破冰相見歡遊戲', owner: '活動組', note: '分小隊進行' },
      { id: generateId(), duration: 60, title: '午餐與休息時間', owner: '全體', note: '發放餐盒' }
    ]);
    setSchedules(initialSchedules);
  };

  const handleSetupSubmit = (e) => {
    e.preventDefault();
    initProjectData(project.days);
    setIsSetup(false);
  };

  // 處理設定變更 (天數增減)
  const handleConfigUpdate = (e) => {
    e.preventDefault();
    const newDays = project.days;
    
    setSchedules(prev => {
      let newS = [...prev];
      if (newDays > prev.length) {
        for (let i = prev.length; i < newDays; i++) {
          newS.push([{ id: generateId(), duration: 60, title: '新增活動', owner: '', note: '' }]);
        }
      } else if (newDays < prev.length) {
        newS = newS.slice(0, newDays);
      }
      return newS;
    });

    setDailyStartTimes(prev => {
      let newT = [...prev];
      if (newDays > prev.length) {
        for (let i = prev.length; i < newDays; i++) {
          newT.push('08:00'); // 預設新增天數為 08:00 開始
        }
      } else if (newDays < prev.length) {
        newT = newT.slice(0, newDays);
      }
      return newT;
    });

    if (currentDay >= newDays) setCurrentDay(newDays - 1);
    setShowConfigModal(false);
  };

  // ★ 核心：動態計算某一天所有行程的開始與結束時間
  const getCalculatedSchedule = (dayIdx) => {
    let currentTime = dailyStartTimes[dayIdx] || '08:00';
    return schedules[dayIdx].map(item => {
      const startTime = currentTime;
      const endTime = addMinutes(currentTime, item.duration);
      currentTime = endTime; // 累加給下一個行程
      return { ...item, startTime, endTime };
    });
  };

  // 修改每日初始開始時間
  const updateDailyStartTime = (timeVal) => {
    setDailyStartTimes(prev => {
      const newTimes = [...prev];
      newTimes[currentDay] = timeVal;
      return newTimes;
    });
  };

  // 修改行程內容 (包含時間長度 duration)
  const updateRow = (rowIdx, field, value) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      let finalValue = value;
      // 確保 duration 為數字
      if (field === 'duration') {
        finalValue = parseInt(value, 10) || 0;
      }
      newSchedules[currentDay][rowIdx] = { ...newSchedules[currentDay][rowIdx], [field]: finalValue };
      return newSchedules;
    });
  };

  const addRow = () => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      newSchedules[currentDay].push({ id: generateId(), duration: 30, title: '', owner: '', note: '' });
      return newSchedules;
    });
  };

  const deleteRow = (rowIdx) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      newSchedules[currentDay].splice(rowIdx, 1);
      return newSchedules;
    });
  };

  const moveRow = (rowIdx, direction) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      const daySchedule = newSchedules[currentDay];
      const targetIdx = rowIdx + direction;
      
      if (targetIdx >= 0 && targetIdx < daySchedule.length) {
        const temp = daySchedule[rowIdx];
        daySchedule[rowIdx] = daySchedule[targetIdx];
        daySchedule[targetIdx] = temp;
      }
      return newSchedules;
    });
  };

  // 1. 匯出圖片
  const exportToImage = async () => {
    try {
      if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        document.body.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }
      
      const canvas = await window.html2canvas(exportContainerRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const link = document.createElement('a');
      link.download = `${project.name}_Day${currentDay + 1}_流程表.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert("匯出圖片失敗，請稍後再試。");
    }
  };

  // 2. 匯出 Word
  const exportToWord = () => {
    const dateInfo = getSpecificDate(project.startDate, currentDay);
    const daySchedule = getCalculatedSchedule(currentDay); // 使用計算後的時間
    
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${project.name}</title>
      <style>
          body { font-family: 'Microsoft JhengHei', Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
          th { background-color: #f1f5f9; }
      </style>
      </head>
      <body>
          <h2>${project.name} - Day ${currentDay + 1} 流程表</h2>
          <p>日期：${dateInfo.formatted} | 該日開始時間：${dailyStartTimes[currentDay]}</p>
          <table>
              <tr><th>時間區間</th><th>花費(分鐘)</th><th>項目/行程名稱</th><th>負責人/組別</th><th>備註說明</th></tr>
              ${daySchedule.map(r => `<tr><td>${r.startTime} - ${r.endTime}</td><td>${r.duration}</td><td>${r.title}</td><td>${r.owner}</td><td>${r.note}</td></tr>`).join('')}
          </table>
      </body></html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${project.name}_Day${currentDay + 1}.doc`;
    link.click();
  };

  // 3. 匯出 Excel (CSV)
  const exportToExcel = () => {
    let csvContent = "\uFEFF"; 
    csvContent += `專案名稱,${project.name}\n\n`;
    
    schedules.forEach((_, idx) => {
      const dateInfo = getSpecificDate(project.startDate, idx);
      const daySchedule = getCalculatedSchedule(idx); // 使用計算後的時間
      
      csvContent += `=== Day ${idx + 1} (${dateInfo.raw}) ===\n`;
      csvContent += `該日開始時間：,${dailyStartTimes[idx]}\n`;
      csvContent += "開始時間,結束時間,花費(分鐘),項目/行程名稱,負責人/組別,備註說明\n";
      daySchedule.forEach(r => {
        csvContent += `"${r.startTime}","${r.endTime}","${r.duration}","${r.title}","${r.owner}","${r.note}"\n`;
      });
      csvContent += "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${project.name}_完整流程表.csv`;
    link.click();
  };

  if (isSetup) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">簡約風活動流程表</h1>
            <p className="text-sm text-slate-500 mt-2 text-center">只要輸入每個活動的時長，我們為您自動串接所有時間！</p>
          </div>
          
          <form onSubmit={handleSetupSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">專案 / 活動名稱</label>
              <input type="text" required value={project.name} onChange={e => setProject({...project, name: e.target.value})}
                placeholder="例如：2026 暑期幹訓營" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">活動天數</label>
                <input type="number" min="1" max="14" required value={project.days} onChange={e => setProject({...project, days: parseInt(e.target.value) || 1})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">起始日期</label>
                <input type="date" required value={project.startDate} onChange={e => setProject({...project, startDate: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
            </div>
            <button type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all">
              開始編排 <ChevronRight size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  const dateInfo = getSpecificDate(project.startDate, currentDay);
  const calculatedSchedule = getCalculatedSchedule(currentDay);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2 rounded-lg"><CalendarDays size={20} /></div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{project.name}</h1>
              <p className="text-xs text-slate-500">共 {project.days} 天</p>
            </div>
          </div>
          <button onClick={() => setShowConfigModal(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
            <Settings size={16} /> <span className="hidden sm:inline">專案設定</span>
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-6">
        
        {/* Controls & Export */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          {/* Day Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
            {Array.from({ length: project.days }).map((_, idx) => (
              <button key={idx} onClick={() => setCurrentDay(idx)}
                className={`px-4 py-2 whitespace-nowrap rounded-lg font-medium text-sm transition-all border ${
                  currentDay === idx ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}>
                Day {idx + 1}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2">
            <button onClick={exportToImage} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-indigo-50 hover:text-indigo-600 transition-colors whitespace-nowrap">
              <ImageIcon size={16} className="text-indigo-500" /> 匯出圖片
            </button>
            <button onClick={exportToWord} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors whitespace-nowrap">
              <FileText size={16} className="text-blue-500" /> 匯出 Word
            </button>
            <button onClick={exportToExcel} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-emerald-50 hover:text-emerald-600 transition-colors whitespace-nowrap">
              <FileSpreadsheet size={16} className="text-emerald-500" /> 匯出 Excel
            </button>
          </div>
        </div>

        {/* Schedule Container for Export */}
        <div ref={exportContainerRef} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="border-b border-slate-100 pb-5 mb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider mb-2 inline-block">Day {currentDay + 1}</span>
              <h2 className="text-2xl font-bold text-slate-800">第 {currentDay + 1} 天流程表</h2>
              <p className="text-sm text-slate-500 mt-1">{dateInfo.formatted}</p>
            </div>
            
            {/* 每日初始時間設定 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                <Clock size={18} className="text-indigo-500" />
                本日開始時間：
              </div>
              <input 
                type="time" 
                value={dailyStartTimes[currentDay]} 
                onChange={(e) => updateDailyStartTime(e.target.value)}
                className="p-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700" 
              />
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-3 w-40 rounded-tl-xl text-center border-r border-white">時間區間 (自動推算)</th>
                  <th className="p-3 w-32 text-center bg-indigo-50/50 text-indigo-700 font-bold border-r border-white">時長 (分鐘)</th>
                  <th className="p-3 min-w-[220px]">項目名稱</th>
                  <th className="p-3 w-36">負責人/組別</th>
                  <th className="p-3 min-w-[150px]">備註</th>
                  <th className="p-3 w-28 rounded-tr-xl text-center" data-html2canvas-ignore>操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculatedSchedule.length === 0 && (
                  <tr><td colSpan="6" className="py-10 text-center text-slate-400">目前尚無行程資料，請點擊下方新增。</td></tr>
                )}
                {calculatedSchedule.map((row, rowIdx) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Read-only time span */}
                    <td className="p-2 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 select-none">
                        <span>{row.startTime}</span>
                        <span className="text-slate-400">-</span>
                        <span>{row.endTime}</span>
                      </div>
                    </td>
                    
                    {/* Editable duration in minutes */}
                    <td className="p-2 text-center bg-indigo-50/10">
                      <div className="flex items-center justify-center">
                        <input type="number" min="0" value={row.duration} 
                          onChange={(e) => updateRow(rowIdx, 'duration', e.target.value)}
                          className="w-20 p-1.5 text-center bg-white border border-indigo-200 rounded-lg text-sm font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" />
                      </div>
                    </td>

                    <td className="p-2">
                      <input type="text" value={row.title} placeholder="輸入活動名稱"
                        onChange={(e) => updateRow(rowIdx, 'title', e.target.value)}
                        className="w-full p-2 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-slate-300 rounded-lg text-sm outline-none transition-all" />
                    </td>
                    <td className="p-2">
                      <input type="text" value={row.owner} placeholder="如：活動組"
                        onChange={(e) => updateRow(rowIdx, 'owner', e.target.value)}
                        className="w-full p-2 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-slate-300 rounded-lg text-sm outline-none transition-all" />
                    </td>
                    <td className="p-2">
                      <input type="text" value={row.note} placeholder="地點或器材..."
                        onChange={(e) => updateRow(rowIdx, 'note', e.target.value)}
                        className="w-full p-2 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-slate-300 rounded-lg text-sm outline-none transition-all" />
                    </td>
                    <td className="p-2 text-center" data-html2canvas-ignore>
                      <div className="flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveRow(rowIdx, -1)} disabled={rowIdx===0} className="p-1.5 text-slate-500 hover:text-indigo-600 disabled:opacity-30 rounded-md hover:bg-slate-100" title="上移"><ArrowUp size={16}/></button>
                        <button onClick={() => moveRow(rowIdx, 1)} disabled={rowIdx===schedules[currentDay].length-1} className="p-1.5 text-slate-500 hover:text-indigo-600 disabled:opacity-30 rounded-md hover:bg-slate-100" title="下移"><ArrowDown size={16}/></button>
                        <button onClick={() => deleteRow(rowIdx)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded-md hover:bg-rose-50" title="刪除"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-5" data-html2canvas-ignore>
            <button onClick={addRow} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold transition-colors shadow-sm">
              <Plus size={18} /> 新增活動項目
            </button>
          </div>
        </div>
      </main>

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2 text-slate-800"><PenBox size={20}/> 修改專案設定</h3>
            <form onSubmit={handleConfigUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">專案名稱</label>
                <input type="text" required value={project.name} onChange={e => setProject({...project, name: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">天數</label>
                  <input type="number" min="1" max="14" required value={project.days} onChange={e => setProject({...project, days: parseInt(e.target.value) || 1})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">起始日</label>
                  <input type="date" required value={project.startDate} onChange={e => setProject({...project, startDate: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-2">
                <button type="button" onClick={() => setShowConfigModal(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-600 transition-colors">取消</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium text-white shadow-md shadow-indigo-200 transition-all">儲存變更</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
