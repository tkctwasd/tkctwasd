<div align="center">

<img width="100%" alt="WASD — Unity Mobile Game Developer" src="https://raw.githubusercontent.com/tkctwasd/tkctwasd/main/assets/banner.svg" />

<br/>

<a href="https://tkctwasd.github.io/tkctwasd/">
  <img alt="Portfolio" src="https://img.shields.io/badge/Portfolio-tkctwasd.github.io-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=0d0b1e" />
</a>
<a href="mailto:dongnm@wasdmobile.com">
  <img alt="Email" src="https://img.shields.io/badge/Email-dongnm@wasdmobile.com-a78bfa?style=for-the-badge&logo=gmail&logoColor=white&labelColor=0d0b1e" />
</a>
<a href="https://github.com/tkctwasd?tab=repositories">
  <img alt="Repositories" src="https://img.shields.io/badge/Repositories-explore-ec4899?style=for-the-badge&logo=github&logoColor=white&labelColor=0d0b1e" />
</a>

<br/><br/>

<img alt="Profile views" src="https://komarev.com/ghpvc/?username=tkctwasd&style=flat-square&color=8b5cf6&label=profile+views" />
<img alt="Focus" src="https://img.shields.io/badge/focus-mobile%20performance-8b5cf6?style=flat-square" />
<img alt="Location" src="https://img.shields.io/badge/based%20in-Vietnam-ec4899?style=flat-square" />

</div>

---

## Hi, I'm Dong 👋

I build **mobile games in Unity** and spend most of my time on the unglamorous half of that
sentence: draw calls, batching, memory churn, and frame pacing. My north star is simple —
**a game should hold 60 FPS on the cheapest phone a player actually owns.**

```csharp
public sealed class Wasd : MonoBehaviour
{
    public string  Role      => "Unity Mobile Game Developer";
    public string[] Platforms => new[] { "iOS", "Android" };

    public string[] Obsessions => new[]
    {
        "GPU instancing & the render pipeline",
        "Burst + Jobs, allocation-free gameplay loops",
        "Custom HLSL / Shader Graph",
        "Idle & gacha economy systems",
    };

    void Update()
    {
        while (Coffee > 0f) Ship();
    }
}
```

<details>
<summary><b>🇻🇳 Đọc bằng tiếng Việt</b></summary>

<br/>

Mình là **Nguyễn Minh Đông**, làm **game mobile bằng Unity**. Phần lớn thời gian của mình
dành cho những thứ ít hào nhoáng nhất: **draw call, batching, memory và frame pacing**.
Mục tiêu rất đơn giản — **game phải giữ được 60 FPS trên chiếc điện thoại rẻ nhất mà người
chơi thực sự đang dùng.**

**Mình làm qua toàn bộ vòng đời một game mobile:**

- **Gameplay** — physics & collider, Animator, particle/VFX, Canvas & UI đa độ phân giải
- **Rendering** — GPU instancing, SRP Batcher, giảm draw call, custom shader HLSL
- **Hiệu năng & DOTS** — Burst + Jobs, DOTS/ECS, pooling, không allocation giữa trận, frame pacing
- **Multiplayer** — đồng bộ trạng thái realtime, kiến trúc client/host, xử lý độ trễ
- **Build & phát hành** — dung lượng build, ASTC, Addressables, build iOS lẫn Android, lên cả hai store
- **Dữ liệu & LiveOps** — Firebase Analytics, đọc chỉ số để cải thiện sản phẩm, remote config, ad mediation
- **Tooling** — tool cho Unity Editor, Python cho pipeline, Luau cho Roblox

**Đang làm:** một game *keyboard* dùng GPU-instanced rendering, một game *brainrot idle/gacha*,
và một *endless runner*.

**Liên hệ:** [dongnm@wasdmobile.com](mailto:dongnm@wasdmobile.com) ·
[Portfolio](https://tkctwasd.github.io/tkctwasd/)

</details>

---

## 🎯 What I'm working on

| Project | What it is | Status |
| :-- | :-- | :-- |
| **Keyboard Game** | Rhythm/typing game rendered with a single GPU-instanced draw call for the whole key grid | 🟣 In development |
| **Brainrot Idle** | Idle + gacha loop with an offline-progress simulator and a tuned economy curve | 🟣 In development |
| **Endless Runner** | Procedural chunk streaming, object pooling, zero mid-run allocations | 🟡 Prototype |

> Repos are opened up as each project reaches a shippable state — the ones already public are
> pinned below.

---

## 🛠️ What I cover

<div align="center">

<img alt="Engine and languages" src="https://skillicons.dev/icons?i=unity,cs,cpp,python,lua,js,git,github&theme=dark" />
<br/>
<img alt="Tools and services" src="https://skillicons.dev/icons?i=firebase,githubactions,visualstudio,vscode,blender,figma,docker,linux&theme=dark" />

</div>

Six domains, all of them touched in shipped work rather than tutorials. The point isn't the list —
it's that a decision in one row is usually a decision in another.

| Domain | |
| :-- | :-- |
| **Gameplay** | Physics & colliders · Animator & state machines · Particles / VFX · Canvas & responsive UI · Input System · Scene & prefab architecture |
| **Rendering & shaders** | URP · GPU instancing · SRP Batcher · HLSL & Shader Graph · Material property blocks · Overdraw & transparency budget |
| **Performance & DOTS** | Profiler & Frame Debugger · Burst + Job System · DOTS / ECS · GC & object pooling · Frame pacing & thermal · IL2CPP |
| **Multiplayer & netcode** | Realtime state sync · Client / host architecture · Latency handling · Sessions & matchmaking · Serialization & bandwidth |
| **Build & release** | Build size & ASTC · Shader stripping · Addressables · iOS build, signing & provisioning · Android build & keystore · App Store Connect · Play Console |
| **Data, LiveOps & tooling** | Firebase Analytics · Event design & funnels · Metrics → product decisions · Remote config & A/B · Ad mediation & IAP · Editor tools, Python pipelines, CI |

> 🔴 **Rather see it than read it?** The portfolio has a
> [live WebGL2 instancing demo](https://tkctwasd.github.io/tkctwasd/#demo) — drag the count up,
> flip from *naive* to *instanced*, and watch the real draw-call counter drop from thousands to one.

---

## ⚡ Performance playbook

A few things I reach for before anyone says the word "optimize":

| Symptom | Usual cause | What I do |
| :-- | :-- | :-- |
| Draw calls in the hundreds | Per-object materials, dynamic batching giving up | Material property blocks → **GPU instancing**, keep the SRP Batcher's cache warm |
| Frame spikes every few seconds | GC from per-frame allocations | Move hot loops to **Burst + Jobs**, pool everything, `NativeArray` over `List` |
| Long cold start | Everything in the first scene | **Addressables** + async warm-up, defer non-critical systems past the first frame |
| Thermal throttling after 10 min | Overdraw and full-rate rendering | Cut transparent layers, cap frame rate deliberately, resolution scaling on weak GPUs |
| Huge build size | Uncompressed textures, unused shader variants | ASTC per platform, shader stripping, dependency audit |

---

## 📊 GitHub in numbers

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tkctwasd/tkctwasd/main/assets/generated/stats-dark.svg" />
  <img height="214" alt="Profile stats" src="https://raw.githubusercontent.com/tkctwasd/tkctwasd/main/assets/generated/stats-light.svg" />
</picture>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tkctwasd/tkctwasd/main/assets/generated/langs-dark.svg" />
  <img height="214" alt="Top languages" src="https://raw.githubusercontent.com/tkctwasd/tkctwasd/main/assets/generated/langs-light.svg" />
</picture>

<br/>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tkctwasd/tkctwasd/main/assets/generated/graph-dark.svg" />
  <img alt="Contribution graph" src="https://raw.githubusercontent.com/tkctwasd/tkctwasd/main/assets/generated/graph-light.svg" />
</picture>

</div>

> Rendered daily by [`.github/workflows/stats.yml`](.github/workflows/stats.yml) straight from the
> GitHub GraphQL API into [`assets/generated/`](assets/generated/) — self-hosted, so there is no
> third-party service left to go dark. The images 404 until that workflow has run once.

---

## 🐍 Contribution graph, eaten

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tkctwasd/tkctwasd/output/snake-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tkctwasd/tkctwasd/output/snake.svg" />
  <img alt="Snake eating the contribution graph" src="https://raw.githubusercontent.com/tkctwasd/tkctwasd/output/snake.svg" />
</picture>

</div>

> Generated by [`.github/workflows/snake.yml`](.github/workflows/snake.yml) — daily, and on every
> push to `main`. The image above stays broken until that workflow has completed once and created
> the `output` branch.

---

## 📌 Pinned work

<div align="center">

<!--
  Swap REPO_NAME below for real repositories once they are public, then delete this comment.
  Duplicate the <a> block for each project you want to feature.
-->
<a href="https://github.com/tkctwasd?tab=repositories">
  <img alt="Browse all repositories" src="https://img.shields.io/badge/Browse_all_repositories-0d0b1e?style=for-the-badge&logo=github&logoColor=a78bfa" />
</a>

</div>

---

<div align="center">

### Want the long version?

The full portfolio — projects, breakdowns, and how I work — lives here:

<a href="https://tkctwasd.github.io/tkctwasd/">
  <img alt="Open portfolio" src="https://img.shields.io/badge/→%20tkctwasd.github.io/tkctwasd-6366f1?style=for-the-badge&labelColor=0d0b1e" />
</a>

<br/>

<img width="100%" alt="" src="https://raw.githubusercontent.com/tkctwasd/tkctwasd/main/assets/footer.svg" />

</div>
