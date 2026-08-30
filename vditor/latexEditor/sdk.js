const LatexEasy = function(t, e) {
    // 支持两种传入方式：
    //   iframe 模式：传入 iframe 元素  (旧方式)
    //   直连模式：传入 window 对象      (新方式，无 iframe)
    this._targetWindow = (t instanceof Window) ? t : (t ? t.contentWindow : window);
    this.randomString = function(e) {
        e = e || 16;
        var i = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678"
          , a = i.length
          , s = "";
        for (let t = 0; t < e; t++)
            s += i.charAt(Math.floor(Math.random() * a));
        return s
    }
    ,
    this._events = {},
    this.on = function(t, e) {
        this._events[t] || (this._events[t] = []),
        this._events[t].push(e)
    }
    ,
    this.off = function(t, e) {
        !this._events[t] || -1 < (e = this._events[t].indexOf(e)) && this._events[t].splice(e, 1)
    }
    ,
    this.callEvent = function(t, e) {
        this._events[t] && this._events[t].forEach(function(t) {
            t(e)
        })
    }
    ,
    this.call = function(t, e, i) {
        i = i || null,
        e = e || {};
        e = {
            id: this.randomString(),
            type: "latexeasy." + t,
            data: e
        };
        console.log("latexeasy.sdk.call", this._targetWindow, e),
        i && this._callWait.push({
            id: e.id,
            expire: Date.now() + 6e4,
            cb: i
        }),
        this._targetWindow.postMessage(e, "*")
    }
    ,
    this._callWait = [],
    this.init = function() {
        const i = this;
        window.addEventListener("message", function(t) {
            var e = t.data;
            if ("object" == typeof e && "string" == typeof e.type)
                switch (e.type) {
                case "latexeasy.ready":
                    i.callEvent("ready", e);
                    break;
                case "latexeasy.result":
                    for (let t = 0; t < i._callWait.length; t++)
                        if (i._callWait[t].id === e.id) {
                            i._callWait[t].cb(e.data),
                            i._callWait.splice(t, 1);
                            break
                        }
                }
        })
    }
};
window.LatexEasy = LatexEasy;
