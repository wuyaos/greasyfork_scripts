// ==UserScript==
// @name         MoviePilot自动登录(自用)
// @version      1.2.2
// @namespace    https://www.muooy.com/
// @description  MoviePilot自动填充账号密码。
// @author       ffwu (Original author Daliyuer)
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=5.2
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @require      https://unpkg.com/axios/dist/axios.min.js
// @license      GPL-3.0
// @icon         data:image/png;base64,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
// @downloadURL https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/moviepilot_autologin.user.js
// @updateURL https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/moviepilot_autologin.user.js
// ==/UserScript==

(function () {
    'use strict';
    /*
    * 更新记录
    * v1.2.2（2025-06-11）
    * 修改了登录逻辑
    * v1.2（2025-04-01）
    * 修复2.3.1以后的版本无法登录的问题
    * 修复了MoviePilot的账号密码错误无法自动登录的问题（账号密码错误重新弹出配置窗口）
    * 优化登录逻辑
    * 无需修改@match配置等代码配置自动判断当前网站是否是MoviePilot，对小白更友好（新增）
    *
    * v1.1（2025-01-05）
    * 新增配置窗口，无需更改文件可直接更改MoviePilot账号密码url信息，第一次使用会弹窗
    * 修复会登录其他程序的问题
    *
    */
    if (document.title == 'MoviePilot') {
        console.log("当前网站为MoviePilot开始执行自动登录程序");
        if (GM_getValue('AutomaticLoginConfig') === 'true') {
            startMonitoring();
        } else {
            popUps();
        }
    }
    function startMonitoring() {
        //注意上面的注释的 @match  也要改成你的MoviePilot的IP地址不要加端口
        let uname = GM_getValue("auname"); //MoviePilot账号
        let upassword = GM_getValue("aupwd"); //MoviePilot密码
        //let MoviePilotHost = localStorage.getItem("auurl"); //MoviePilot地址ip+端口 后缀不需要加 /
        let MoviePilotHost = window.location.origin; // 获取当前域名和端口

        //不懂的不要动以下代码
        var currentUrl = window.location.href;
        let intervalId;
        let vueRouter;
        var isCloud = 0;
        function waitForVue() {
            return new Promise((resolve) => {
                const checkVue = () => {
                    if (window.Vue && window.Vue.prototype.$router) {
                        vueRouter = window.Vue.prototype.$router;
                        resolve();
                    } else {
                        setTimeout(checkVue, 1000);
                    }
                };
                checkVue();
            });
        }


        function checkUrlChange() {
            const newUrl = window.location.href;
            if (!newUrl.includes(MoviePilotHost + '/#/login')) {
                clearInterval(intervalId);
                currentUrl = newUrl;
                startMonitoring();
            } else {
                info11();
            }
        }


        function info11() {

            let formData = new FormData();
            formData.append('username', uname);
            formData.append('password', upassword);
            // 查找用户名和密码输入框
            let usernameInput = document.querySelector('input[name="username"]');
            let passwordInput = document.querySelector('input[name="current-password"]');
            let loginButton = document.querySelector('button[type="submit"], button.login-button'); // 适配不同按钮

            function setInputValue(element, value) {
                let nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                nativeInputValueSetter.call(element, value);
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }

            setInputValue(usernameInput, GM_getValue("auname"));
            setInputValue(passwordInput, GM_getValue("aupwd"));

            loginButton.click();

            axios.post(MoviePilotHost + '/api/v1/login/access-token', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
                .then(function (response) {
                })
                .catch(function (error) {
                    if (error.response && error.response.status === 401) {
                        console.log('Unauthorized: 401 Status Code');
                        GM_setValue('AutomaticLoginConfig', 'false');
                        alert("账号密码错误，请重新输入");
                        window.history.go(0);
                    } else {
                        console.error('Error posting data:', error);
                        window.history.go(0);
                    }
                });
        }

        // function info11() {

        //     let formData = new FormData();
        //     formData.append('username', uname);
        //     formData.append('password', upassword);




        //     axios.post(MoviePilotHost + '/api/v1/login/access-token', formData, {
        //         headers: {
        //             'Content-Type': 'multipart/form-data'
        //         }
        //     })
        //         .then(function (response) {

        //             axios.get(MoviePilotHost + '/api/v1/user/config/Layout', {
        //                 headers: {
        //                     'Authorization': 'Bearer ' + response.data.access_token
        //                 }
        //             }).then((responsea) => {


        //                 localStorage.setItem('auth', '{"token":"' + response.data.access_token + '","remember":true,"originalPath":"/dashboard"}');

        //                 axios.get(MoviePilotHost + '/api/v1/user/config/Dashboard', {
        //                     headers: {
        //                         'Authorization': 'Bearer ' + response.data.access_token
        //                     }
        //                 }).then((responsea) => {

        //                     location.reload();




        //                 });
        //             });

        //         })
        //         .catch(function (error) {
        //             if (error.response && error.response.status === 401) {
        //                 console.log('Unauthorized: 401 Status Code');
        //                 GM_setValue('AutomaticLoginConfig', 'false');
        //                 alert("账号密码错误，请重新输入");
        //                 window.history.go(0);
        //             } else {
        //                 console.error('Error posting data:', error);
        //                 window.history.go(0);
        //             }
        //         });
        // }


        function startMonitoring() {
            intervalId = setInterval(checkUrlChange, 1000);
        }


        function setupRouteChangeListeners() {

            const pushState = history.pushState;
            history.pushState = function (state) {
                pushState.apply(history, arguments);
                checkUrlChange();
            };


            window.addEventListener('hashchange', checkUrlChange);


            window.addEventListener('popstate', checkUrlChange);
        }

        async function navigateToNewUrl() {
            await waitForVue();
            const newPath = '/dashboard';
            vueRouter.push(newPath);
        }


        window.onload = startMonitoring();
        setupRouteChangeListeners();
        console.log("本脚本出生于2024-11-20，功能原创，请勿盗版！博客：https://www.muooy.com")
        return;

    }
    function popUps() {
        const style = document.createElement('style');
        style.innerHTML = `
    .AutomaticLoginForm {
    max-width: 650px;
    margin: 50px auto;
    padding: 20px;
    background: #f2f2f2;
    border: 1px solid #ddd;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.AutomaticLoginForm h2 {
    text-align: center;
    color: #333;
    margin-bottom: 20px;
}

.AutomaticLoginForm input[type="text"],
.AutomaticLoginForm input[type="password"] {
    width: 100%;
    padding: 10px;
    margin: 10px 0;
    border: 1px solid #ddd;
    border-radius: 5px;
    box-sizing: border-box;
}

.AutomaticLoginForm input[type="submit"] {
    width: 100%;
    padding: 10px;
    background: rgb(145, 85, 253);
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.AutomaticLoginForm input[type="submit"]:hover {
    background: rgb(148, 91, 255);
}
    `;
        document.head.appendChild(style);

        // 创建弹窗的 HTML（包含表单）
        const modalHTML = `
        <div id="AutomaticLoginMode" style="display:none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 500px; height: auto; z-index: 9999;">
            <form id="AutomaticLoginForm"class="AutomaticLoginForm" action="#" method="post">
                   <h2>MoviePilot自动登录配置</h2>
                   <input type="text" id="ausername" name="ausername" placeholder="MoviePilot的账号" required>
                   <input type="password" id="apassword" name="apassword" placeholder="MoviePilot的密码" required>
                   <!--input type="text" id="aurls" name="aurls" placeholder="地址:ip+端口,如:http://192.168.5.10:3000" required--!>
                   <p id="message" style="display:none;text-align: center; color: red;">配置成功!</p>
                   <input type="submit" value="保存">
            </form>
             </div>
        <div id="modalBackdrop" style="display:none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 9998;"></div>
    `;


        document.body.insertAdjacentHTML('beforeend', modalHTML);


        const amodal = document.getElementById('AutomaticLoginMode');
        const backdrop = document.getElementById('modalBackdrop');
        const aform = document.getElementById('AutomaticLoginForm');
        const amessage = document.getElementById('message');


        function showModal() {
            amodal.style.display = 'block';
            backdrop.style.display = 'block';
        }


        function closeModal() {
            amodal.style.display = 'none';
            backdrop.style.display = 'none';
            startMonitoring();
            //location.reload();
        }

        // 表单提交处理
        function handleSubmit(event) {
            event.preventDefault();


            const auname = document.getElementById('ausername').value;
            const aupwd = document.getElementById('apassword').value;
            //const auurl = document.getElementById('aurls').value;
            GM_setValue("auname", auname);
            GM_setValue("aupwd", aupwd);
            // GM_setValue("auurl", auurl);



            amessage.style.display = 'block';
            GM_setValue('AutomaticLoginConfig', 'true'); // 设置提交标记

            setTimeout(closeModal, 1000); // 1秒后关闭弹窗
        }

        // 绑定表单提交事件
        aform.addEventListener('submit', handleSubmit);

        // 在页面加载完成后，显示弹窗
        window.addEventListener('load', showModal);
    }
})();