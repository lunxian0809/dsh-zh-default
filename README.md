# dsh-zh-default

让 DeepSeek Harness 的**思考过程（reasoning / thinking）**与**最终回答**默认使用简体中文。

它不注册工具、不改 Web UI、不翻译历史消息，只向系统提示词注册一段全局 section
（`language:zh-default`，order 300，落在 persona 前缀之后、plan 策略之前）：

- 思考过程直接用中文推理、列计划、自我检查，不要先英文打草稿再翻译；
- 最终回答正文用中文，代码 / 命令 / 路径 / API 名 / 日志与引用原文保持原样；
- 用户用英文提问也默认中文回答，只有**本轮明确要求**换语言才切换；
- 子代理、团队成员、工作流里的输出同样继承这条策略（全局 unscoped section）。

## 安装

从本地目录（开发 / 改动即生效）：

```powershell
dsh plugin --profile web add link:D:/DSH/dsh-zh-default
```

从 GitHub：

```powershell
dsh plugin --profile web add github:lunxian0809/dsh-zh-default
```

`link:` 安装后插件随包热加载（无需重装）；核心重启后依旧生效。卸载：

```powershell
dsh plugin --profile web remove dsh-zh-default
```

## 配置

本包自带 `cordis.patch.yml`（id 固定为 `zh-default`），安装即启用。要覆盖配置，在
profile 的 `cordis.patch.yml`（`$DSH_HOME/profiles/web/cordis.patch.yml`）里按 id 追加：

```yaml
- id: zh-default
  config:
    enabled: true
    language: 简体中文
    thinking: true
    bilingual: true
    order: 300
    extra: ''
```

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `true` | `false` 时完全不注册 section（等价于禁用本插件） |
| `language` | `简体中文` | 提示词里展示的语言名，如 `繁體中文` |
| `thinking` | `true` | 是否也要求思考过程用中文；`false` 只约束最终回答 |
| `bilingual` | `true` | 是否附一句英文兜底（对英文系统提示词更硬） |
| `order` | `300` | 段落排序：`0` 是 persona 前缀，`500` 是 plan 策略 |
| `extra` | 空 | 追加的自定义规则，多行用 `\n` |

### 只对某些会话生效？

不支持按会话开关——本插件是全局 section，装了就对所有会话、子代理、团队成员生效。
如需按 agent 定制，可把它挂进 agent preset 的 scope，或用 `dsh-persona` 的 persona
文本另写规则。

## 自测与验证

```powershell
cd D:/DSH/dsh-zh-default
node --check lib/index.js
node scripts/selftest.mjs   # 假 ctx 验证注册逻辑，并打印真正注入的段落文本
```

装好后想确认真的进了提示词：看核心日志有没有加载错误，以及会话
`$DSH_HOME/sessions/<workspace>/<session>/session.v*.jsonl.zstd` 里新增的
`system/message` 事件是否包含 `## 语言策略：默认使用简体中文`。

## 说明

- 这是**行为约束**而不是硬开关：模型绝大多数时候会照做，但推理语言仍可能偶发英文。
  如果必须在 UI 上看到中文思考，可以另装官方实验插件
  `@deepseek-ai/dsh-experimental-cot-translation-bundle`（机器翻译 reasoning 展示，
  需联网、依赖 translator provider）。
- 修改 `lib/index.js` 后，重启核心（或重开桌面端）生效；只改配置的话，插件管理器会重载。
- 文本里写了「本轮明确要求才换语言」，所以用户当场说「用英文答」不会被打回中文。
