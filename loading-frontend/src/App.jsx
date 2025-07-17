import './App.css'

function App() {
  return (
    <div className="loading-container">
      <div className="loader">
        <div className="circle"></div>
        <div className="circle"></div>
        <div className="circle"></div>
        <div className="circle"></div>
      </div>
      <p className="loading-text">启动中...</p>
      <p className="loading-text">首次启动时初始化数据需要几分钟时间，请耐心等待...</p>
    </div>
  )
}

export default App
