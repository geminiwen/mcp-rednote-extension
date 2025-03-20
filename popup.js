document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectBtn');

  chrome.runtime.sendMessage({ action: "queryState" }, (response) => {
    if (response.data) {
        connectBtn.textContent = '连接成功';
        connectBtn.disabled = true;
    } else {
        connectBtn.textContent = '连接 MCP 服务器';
        connectBtn.disabled = false;
    }
  }); 

  chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        const { type } = request;
        switch(type) {
            case "stateChaged": {
                if (request.data.connected) {
                    connectBtn.textContent = '连接成功';
                    connectBtn.disabled = true;
                } else {
                    connectBtn.textContent = '连接 MCP 服务器';
                    connectBtn.disabled = false;
                }
                break;
            }
        }
    }
  );
  
  
  connectBtn.addEventListener('click', async () => {
    try {
        connectBtn.textContent = '连接中...';
        connectBtn.disabled = true;
        chrome.runtime.sendMessage({ action: "connect" }); 
    } catch (error) {
      console.error('连接失败:', error);
      connectBtn.textContent = '连接失败，重试';
      connectBtn.disabled = false;
    }
  });
});