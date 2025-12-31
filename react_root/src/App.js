import logo from './logo.svg';
import './App.css';

function App() {

  function send() {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        console.log('请求结果：', data);
      })
      .catch(err => {
        console.error('请求出错：', err);
      });
  }

  return (
    <div className="App">
      <button onClick={() => send()}>发送请求</button>
    </div>
  )
}

export default App;
