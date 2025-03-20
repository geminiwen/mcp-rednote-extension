let ws = null;
let retryDelay = 1000;

const openCreatorPageIfNeed = async (payload) => {
  const url = "https://creator.xiaohongshu.com/publish/publish*";
  const tabs = await chrome.tabs.query({ url });

  let tab;
  if (tabs.length === 0) {
      // 如果没有匹配的标签页，则打开新页面
    tab = await chrome.tabs.create({ url: url });
  } else {
    tab = tabs[0];
    await chrome.tabs.update(tab.id, { active: true });
  }

  chrome.tabs.sendMessage(tab.id, payload);

}


function connectWebSocket() {
    if (ws) {
      console.log('WebSocket已经连接');
      return;
    }
  ws = new WebSocket('ws://localhost:3001/client?token=123');

  ws.onopen = () => {
    console.log('WebSocket连接成功');
    chrome.runtime.sendMessage({ type: "stateChaged", data: { connected: true } });
    retryDelay = 1000; // 重置重试间隔
  };

  ws.onmessage = async (event) => {
    console.log('收到消息:', event.data);
    const data = JSON.parse(event.data);
    // 在这里处理接收到的消息
    const { type }  = data;
    switch(type) {
        case "task": {
            const { payload } = data;
            try {
              await openCreatorPageIfNeed(payload);
           
              ws.send(JSON.stringify({
                  "result": "ok",
                  "success": true,
              }))
            } catch (e) {
              ws.send(JSON.stringify({
                "result": "not ok",
                "success": false,
                "message": "Create Notes F"
              }))
            }
            break;
        }
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket错误:', error);
    ws = undefined;
    chrome.runtime.sendMessage({ type: "stateChaged", data: { connected: true } });
    scheduleReconnect();
  };

  ws.onclose = (event) => {
    console.log(`连接关闭，代码: ${event.code}, 原因: ${event.reason}`);
    ws = undefined;
    chrome.runtime.sendMessage({ type: "stateChaged", data: { connected: true } });
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  setTimeout(() => {
    console.log(`尝试重新连接，间隔: ${retryDelay}ms`);
    retryDelay = Math.min(retryDelay * 2, 30000); // 指数退避，最大30秒
    connectWebSocket();
  }, retryDelay);
}

const fetchImage = async (url, sendResponse) => {
  try {
    const remoteData = await fetch(url);
    const rawData = await remoteData.blob()
    const fileReader = new FileReader;
    fileReader.onloadend = () => {
      sendResponse({
            success: true,
            data: fileReader.result
        })
    };
    fileReader.readAsDataURL(rawData)
  } catch (e) {
    sendResponse({
          success: false,
          message: e.message
      })
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
    const { action } = request;
    switch (action) {
        case "connect": {
            connectWebSocket();
            sendResponse({ "result": "ok", success: true});
            break;
        }
        case "queryState": {
            sendResponse({ "result": "ok", success: true, data: ws !== null});
        }
        case "fetchImage": {
          const { url } = request;
          fetchImage(url, sendResponse);
        }
    }
    return true;
});
