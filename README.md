RO 倖存者油猴助手

仓库：[rzj0506/auto-ro-survivors](https://github.com/rzj0506/auto-ro-survivors)

源码位于 main 分支，`.github/workflows/publish-userscript.yml` 负责把新版本发布到 userscript-release 分支。

v1.6.0 适配 [ro-survivors.com](https://ro-survivors.com/)，仅在新站运行。新增斐扬洞穴月夜猫钟罩避难：钟罩出现后优先进入并限制罩内走位，暂停追物与打开累积升级。封印之钟仍需按游戏机制击杀指定小王解封，站在未解封钟内并不安全。保留独立重抽、智能累积升级、四语系选卡、原始 ID 识别、拖动面板、配置优先级、避怪拾取、放逐、重复远征与后台挂机。

旧站设置不会跨域自动迁移，更新前可从旧站助手导出 JSON，在新站导入；也可使用示例配置或重新设置。完整说明见 [使用说明](docs/使用说明.md)。后台模式要求标签页仍在运行，浏览器冻结／丢弃页面或电脑睡眠时无法执行。104 项本地功能检查通过，尚未完成真实账号实战联调。

首次安装与检查：

1. 仓库保持公开，启用 GitHub Actions。
2. 工作流需要 `contents: write` 才能推送 `userscript-release` 发布分支；仓库或组织策略必须允许这项权限。
3. 工作流成功后，打开下面的安装地址，在 Tampermonkey 安装一次或更新已有脚本。
4. 油猴中保留脚本的自动更新检查。新版实际安装时间取决于油猴的检查频率；它不是聊天消息即时推送。

[安装／更新地址](https://raw.githubusercontent.com/rzj0506/auto-ro-survivors/userscript-release/ro-survivors-helper.user.js)

[版本元数据](https://raw.githubusercontent.com/rzj0506/auto-ro-survivors/userscript-release/ro-survivors-helper.meta.js)

以后每次更新，修改 `src/ro-survivors-helper.user.js`，同时递增文件头 `@version` 与正文 `const VERSION`，提交到 main。工作流会验证并自动发布。脚本名称、namespace、固定下载路径保持不变，浏览器内已有配置保留。

自动发布使用仓库内置的 GITHUB_TOKEN，无需把个人令牌填进油猴脚本或仓库代码。脚本只从上述固定地址检查新版本，运行中的游戏页面需要刷新后才会载入新代码。

本地检查及构建：

```text
node test/smoke.cjs
node scripts/build-release.cjs --repository rzj0506/auto-ro-survivors
```

输出到 dist。无需安装 Node 依赖。构建器校验版本一致性、生成 `.user.js`／`.meta.js` 及 SHA-256 清单，不修改游戏或配置数据。

仓库初始化后若没有自动运行，可在 Actions → Publish userscript → Run workflow 手动运行一次。工作流未成功前，安装地址尚不可用。

机制参考：[Tampermonkey 更新地址](https://www.tampermonkey.net/documentation.php?locale=en&q=update_url)、[GitHub Actions 内置认证](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)。
