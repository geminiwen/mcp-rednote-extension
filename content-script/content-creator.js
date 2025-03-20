async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function insertTextIntoElement(targetElement, textToInsert, shouldTypeSlowly = false) {
    if (shouldTypeSlowly) {
        for (const char of textToInsert) {
            targetElement.isContentEditable ? document.execCommand("insertText", false, char) : targetElement.value += char,
            targetElement.dispatchEvent(new Event("input",{
                bubbles: true
            })),
            targetElement.dispatchEvent(new Event("change",{
                bubbles: true
            })),
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
        }
    } else {
        targetElement.isContentEditable ? targetElement.innerHTML = textToInsert : targetElement.value += textToInsert,
        targetElement.dispatchEvent(new Event("input",{
            bubbles: true
        })),
        targetElement.dispatchEvent(new Event("change",{
            bubbles: true
        })),
        await new Promise(resolve => setTimeout(resolve, 2000))
    }
}

async function simulateTyping(targetElement, charToType) {
    targetElement.focus(),
    document.execCommand("insertText", false, charToType);
    const inputEvent = new InputEvent("input",{
        inputType: "insertText",
        data: charToType,
        bubbles: true,
        cancelable: true
    });
    targetElement.dispatchEvent(inputEvent);
    const keydownEvent = new KeyboardEvent("keydown",{
        key: charToType,
        keyCode: charToType.charCodeAt(0),
        which: charToType.charCodeAt(0),
        bubbles: true,
        cancelable: true
    });
    targetElement.dispatchEvent(keydownEvent);
    const keyupEvent = new KeyboardEvent("keyup",{
        key: charToType,
        keyCode: charToType.charCodeAt(0),
        which: charToType.charCodeAt(0),
        bubbles: true,
        cancelable: true
    });
    targetElement.dispatchEvent(keyupEvent),
    await new Promise(resolve => setTimeout(resolve, 20))
}
async function simulateMouseAndWheelEvents() {
    const postTextarea = document.getElementById("post-textarea");
    if (postTextarea) {
        const simulateMouseMove = () => {
            const mouseMoveEvent = new MouseEvent("mousemove",{
                view: window,
                bubbles: true,
                cancelable: true
            });
            postTextarea.dispatchEvent(mouseMoveEvent)
        }
          , simulateWheelScroll = () => {
            const wheelEvent = new WheelEvent("wheel",{
                view: window,
                bubbles: true,
                cancelable: true,
                deltaY: 100
            });
            postTextarea.dispatchEvent(wheelEvent)
        }
        ;
        simulateMouseMove();
        for (let i = 0; i < 10; i++)
            setTimeout(simulateWheelScroll, (i + 1) * 10)
    }
}
async function waitForElementByXPath(xpathExpression, timeout = 10000) {
    return new Promise( (resolve, reject) => {
        const startTime = Date.now()
          , intervalId = setInterval( () => {
            const element = document.evaluate(xpathExpression, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            element ? (clearInterval(intervalId),
            resolve(element)) : Date.now() - startTime > timeout && (clearInterval(intervalId),
            reject(new Error("elementNotFound")))
        }
        , 100)
    }
    )
}
async function findElementByClass(className) {
    return waitForElementByXPath(`//*[contains(concat(" ", normalize-space(@class), " "), " ${className} ")]`)
}

function waitForMentionList(limit) {
    return new Promise(resolve => {
        const startTime = Date.now()
        const intervalId = setInterval(() => {
            if(document.querySelectorAll(".ql-mention-list-item").length > 0 || Date.now() - startTime > limit) {
                clearInterval(intervalId);
                resolve();
            }
        }, 100)
    })
}
async function addTagsToElement(tags, targetElement) {
    var selectedTagText;
    for (const tag of tags) {
        const range = document.createRange()
          , selection = window.getSelection();
        range.selectNodeContents(targetElement),
        range.collapse(false),
        selection == null || selection.removeAllRanges(),
        selection == null || selection.addRange(range),
        await simulateTyping(targetElement, "#"),
        await simulateTyping(targetElement, tag),
        await new Promise(resolve => setTimeout(resolve, 1000)),
        await waitForMentionList(1000);
        const mentionListItems = document.querySelectorAll(".ql-mention-list-item");
        for (const item of mentionListItems) {
            if ((selectedTagText = item.textContent) != null && selectedTagText.includes(tag)) {
                item.scrollIntoView(),
                await new Promise(resolve => setTimeout(resolve, 100)),
                item.dispatchEvent(new MouseEvent("mousedown",{
                    bubbles: true,
                    cancelable: true
                })),
                item.dispatchEvent(new MouseEvent("mouseup",{
                    bubbles: true,
                    cancelable: true
                })),
                item.dispatchEvent(new MouseEvent("click",{
                    bubbles: true,
                    cancelable: true
                }));
                break
            }
        }
        await sleep(1000)
    }
}
async function publish(config) {
    try {
        if (config.type === "image") {
            try {
                (await findElementByClass("upload-container")).querySelectorAll(".creator-tab")[1].click()
            } catch (error) {
                console.error("上传图文按钮未找到", error)
            }
            await uploadCoverImages(config.covers)
        }
        try {
            const titleInput = (await findElementByClass("titleInput")).querySelector("input");
            await insertTextIntoElement(titleInput, config.title)
        } catch (error) {
            console.error("标题输入框未找到", error)
        }
        const quillEditor = document.querySelector("#quillEditor")
          , contentEditableElement = quillEditor == null ? void 0 : quillEditor.querySelector('[contenteditable="true"]');
        if (!contentEditableElement)
            throw new Error("content.descriptionNotFound");
        contentEditableElement.focus();
        contentEditableElement.innerHTML = "";
        await insertTextIntoElement(contentEditableElement, `${config.content}`);
        await new Promise(resolve => setTimeout(resolve, 200));
        contentEditableElement.scrollTo(0, contentEditableElement.scrollHeight);
        await new Promise(resolve => setTimeout(resolve, 200));
        simulateMouseAndWheelEvents();
        if (config.tags && config.tags.length > 0) {
            await addTagsToElement(config.tags, contentEditableElement);
        }
        config.publish && (await findElementByClass("publishBtn")).click();
        return {
            success: true,
            message: "发布成功"
        }
    } catch (e) {
        console.error("发布失败:", e);
        return {
            success: false,
            message: `Error: ${e.message}`
        }
    }
}
async function fetchImage(e) {
    try {
        const t = await chrome.runtime.sendMessage({
            action: "fetchImage",
            url: e
        });
        if (!t.success)
            throw new Error(t.message);
        const s = atob(t.data.split(",")[1])
          , n = t.data.split(",")[0].split(":")[1].split(";")[0]
          , o = new ArrayBuffer(s.length)
          , a = new Uint8Array(o);
        for (let r = 0; r < s.length; r++)
            a[r] = s.charCodeAt(r);
        const c = new Blob([o],{
            type: n
        });
        return new File([c], "image.png", {
            type: "image/png"
        })
    } catch (e) {
        console.error("获取图片失败:", e);
        throw e;
    }
}
async function uploadCoverImages(e) {
    try {
        const t = [];
        for (const o of e) {
            const a = await fetchImage(o);
            t.push(a)
        }
        const s = await waitForElementByXPath('//input[@type="file"]')
          , n = new DataTransfer;
        t.forEach(o => {
            n.items.add(o)
        }
        ),
        s.files = n.files,
        s.dispatchEvent(new Event("change",{
            bubbles: true
        })),
        await new Promise(resolve => setTimeout(resolve, 1e3))
    } catch (e) {
        return console.error("上传图片失败", e),
        Promise.reject(new Error("上传图片失败"))
    }
}

chrome.runtime.onMessage.addListener((e, t, sendResponse) => {
    if (e.action === "createPost") {
        return publish(e.config).then(n => {
            sendResponse(n)
        }).catch(e => {
            console.error("publishContent error:", e),
            sendResponse({
                success: false,
                message: e.message
            })
        })
    }
    return true;
});
