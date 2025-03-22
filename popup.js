document.addEventListener('DOMContentLoaded', async () => {
  const connectBtn = document.getElementById('connectBtn');
  const tokenInput = document.getElementById('tokenInput');

  // 从 Chrome Storage 读取保存的 Token
  const result = await chrome.storage.local.get(['mcpToken']);
  if (result.mcpToken) {
    tokenInput.value = result.mcpToken;
  }

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
        const token = tokenInput.value.trim();
        if (!token) {
            alert('请输入Token');
            return;
        }

        // 保存 Token 到 Chrome Storage
        await chrome.storage.local.set({ mcpToken: token });

        connectBtn.textContent = '连接中...';
        connectBtn.disabled = true;
        chrome.runtime.sendMessage({ action: "connect", token: token }); 
    } catch (error) {
      console.error('连接失败:', error);
      connectBtn.textContent = '连接失败，重试';
      connectBtn.disabled = false;
    }
  });
});