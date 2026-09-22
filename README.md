<div align="center">
  <img src="https://devsarena.sudokrishna.dev/logos/white.svg" alt="DevsArena-Logo" width="80" height="80" />
  <p><strong>Build Complex Software.
One Checkpoint at a Time.</strong></p>
</div>

Welcome to <a href="https://devsarena.sudokrishna.dev/">**DevsArena**</a> – your playground in the cloud for learning, experimenting, and building real projects without installing anything locally.
Launch coding environments in seconds, write code directly in the browser, run servers and tests, and explore technologies just like a real dev setup 💻✨

At its heart, DevsArena revolves around two core ideas:

- 🧪 **Playgrounds** – quick, temporary coding environments
- 🎯 **Projects (Quests)** – structured learning paths with checkpoints and validations  


This document explains how the system works internally.

---

## 🌟 What DevsArena Offers

Here’s what you get out of the box:

- ⚡ Instant browser-based coding environments  
- 📝 In-browser IDE with live file system  
- 🖥️ Real terminal access using PTY  
- 🧩 Guided projects with built-in test validation  
- 🔒 Secure isolated sandboxes  
- ☁️ Kubernetes-powered orchestration  
- 🔁 Real-time sync and progress tracking  

All of this runs inside isolated containers so you get a real-world development experience – right from your browser.

---
<div align="center"> <h3>Curious to know how this was built? 🏗️</h3> <p>I'm documenting the entire engineering journey, architectural decisions, and technical deep-dives.</p> <a href="https://blogs.devsarena.in"> <img src="https://img.shields.io/badge/read_the_blog-blogs.devsarena.in-blue?style=for-the-badge&logo=hashnode" alt="Read the Blog" /> </a> </div>

---
# 🎮 All About Playgrounds

Playgrounds are the fastest way to jump into DevsArena.

They are **temporary, on-demand coding environments** where you can instantly experiment with different technologies without any setup.

### 🛠️ Currently Supported Playground Types

<div align="center">

<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="70" height="70" /> &nbsp;&nbsp;
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="70" height="70" /> &nbsp;&nbsp;
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" width="70" height="70" /> &nbsp;&nbsp;
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" width="70" height="70" />

</div>

We currently support:

- ⚛️ **React JS Playground**  
- 🟢 **Node JS Playground**  
- 🚂 **Express JS Playground**  
- 📜 **Vanilla JavaScript Playground**  


Each playground runs inside its own isolated container with a preconfigured runtime.

## 🐳 The Runtime Image

All Node-based playgrounds use a common base runtime image: <a href="https://hub.docker.com/repository/docker/krishnawyvern/devsarena-node-runtime">`krishnawyvern/devsarena-node-runtime`</a>

This image is built on top of: `node:22-alpine` and includes:

- Node runtime  
- Required system dependencies  
- The DevsArena test-runner service  
- Supporting scripts and binaries  

The image source lives at: <a href="https://github.com/KrishnaChaitanya45/CodeX/tree/main/server/k8s/images/runtime/node">`/server/k8s/images/runtime/node`</a>

This single image powers:
- React playgrounds  
- Node playgrounds  
- Express playgrounds  
- Vanilla JS playgrounds  

The test-runner bundled inside contains both JavaScript utilities and a Go binary. Basically its bundled with the test engine. 

(More details on this in the **All About Test Engine** section 🧪)

---

# 🧠 How a Playground Actually Works

Let’s walk step-by-step through what happens when a user clicks **“Start Playground”**.

Grab a coffee ☕ and may be something to eat 🍔 – this is the full journey!

<img width="1609" height="890" alt="image" src="https://github.com/user-attachments/assets/0fd0b832-838b-46f1-96b1-d01c5160a25b" />
Here's the full picture on how the playground instance gets started. 


## 👆 Step 1 – User Clicks Start

User opens:

<a href="https://devsarena.sudokrishna.dev/playground">`/playground`</a> and clicks **Start Playground** (for example, React playground).

The frontend sends:

`POST /api/playground/start`

with payload:

- labId  
- language  


## 🆔 Step 2 – Lab ID Generation

Every playground gets a unique **Lab ID**.

Instead of boring random strings, we generate fun names by combining characters from:

- 📖 **Mahabharata**  
- 🏹 **Ramayana**  

This makes lab IDs human-friendly and memorable 😄


## 🔁 Step 3 – API Request Flow

The frontend route:

`/api/playground/start` forwards the request to: `https://api.devsarena.in/v0/playground`

Payload includes:

- UserId  
- LabId  
- Language  

### 👻 For Unauthenticated Users

- `userId` is sent as an empty string  
- Middleware later attaches userId if available  


## ⚙️ Step 4 – Lambda Handler Takes Over

The real work starts in the Go lambda handler:

<a href="https://github.com/KrishnaChaitanya45/CodeX/blob/main/server/lambda-handlers/start-quest/main.go">`/server/lambda-handlers/start-quest/main.go`</a>

This handler:

- Creates Kubernetes client connection  
- Connects to PostgreSQL  
- Connects to Redis  

Basically – it prepares the entire DevsArena backend engine 🚗💨, basically introduces it self to all the other services, and gets ready for the next steps. 

## 🚦 Step 5 – Resource Limit Checks

Before creating anything, the system checks limits.

**Current limits (subject to change):**

- Max active labs system-wide: **5**  
- Max playgrounds per authenticated user: **10**

The handler checks:

- Total active lab count  
- User-specific lab usage  

If limits are exceeded:

- No new lab is created  
- Proper error response is returned, which basically says Sorry ! **Try exhausing the active limits count and check the error messages, I've added something fun there. 😉!**

## 🔍 Step 6 – Does This Lab Already Exist?

Next, we check the database:

- If lab exists → reuse existing data  
- If not → create a brand new lab  


## 🧾 Step 7 – Creating Lab Entry in Redis

For new labs, we create a Redis entry like:

```json
{
  "labId": "",
  "createdAt": "",
  "language": "react",
  "activeCheckpoint": 1,
  "dirtyReadPaths": [],
  "status": "booting",
  "lastUpdatedAt": "",
  "progressLogs": []
}

```

Which as you can already see includes all the basic info about the labs, the **dirtyReadPaths** and **progressLogs** are something special, We'll get back to them on **All About Lab Sycs and Exit** section


## ⏮️ Step 8 – Restoring Existing Labs [ Lab ka Punar Janm 👽]

If the lab already exists in DB:

- Progress data is restored  
- User resumes exactly where they left off  

Seamless experience 😌

**Basically lab wapas hosh me aayega**


##   📁   Step 9 – Preparing Code Workspace
Now we prepare actual code files.

**There are two possible scenarios:**

### 👤 Authenticated User + New Lab

Boilerplate code is copied from:

`boilerplate/react` to: `code/[userId]/[language]/playgrounds/[labId]`

### 👻 Guest User [ ABHEY HE KOHN TU ? 🤨 ]

- No persistence  [ **AUKAAT ME REHNA HE ! 👾** ]
- Code runs directly from boilerplate folder  


We set a variable called `codeLink`.

- **Logged-in users → user-specific directory**  
- **Guests → default boilerplate path**  

This tells the container where to load code from.



##  🚢 Step 10 – Spinning Up Kubernetes Pod

All details gathered so far:

- labId  
- codeLink  
- language  
- user info  

are passed to:
`k8s.SpinUpPodWithLanguage()`

This launches a Kubernetes deployment using: <a href="https://github.com/KrishnaChaitanya45/CodeX/blob/main/server/k8s/templates/deployment.template.yaml">`/server/k8s/templates/deployment.template.yaml`</a>


##  🧩 Step 11 – What Runs Inside the Pod

Each playground pod contains:

- 🟡 **1 Init Container**  
- 🟢 **3 Main Containers**

### Init Container

`copy-r2-container`

- Copies code from `codeLink`  
- Moves it into `/workspace`  
- Shared by other containers  

### Main Containers

- `app-container`  
- `runner-container`  
- Supporting services  

All containers share the same `/workspace` volume.

(More in **All About Kubernetes** ☸️)


## ⚡ Step 12 – Async Pod Creation

Pod creation happens asynchronously.

The lambda function:

- Triggers pod creation  
- Returns success immediately  
- Doesn’t wait for readiness  

Fast and non-blocking 🚀


##  🌐  Step 14 – Frontend Loading Flow

User is redirected to: `/playground/[language]/[labId]`

A loading screen appears while things boot up.

Frontend keeps polling: `/api/project/progress/[labId]`

Data comes from Redis.
As soon as status becomes:
`active`
the UI moves forward.


## 🔌  Step 15 – WebSocket Connections

Now the frontend connects to two WebSocket services:

- `/fs` – File System service  
- `/pty` – Terminal service  

When both are connected:

- Loading screen disappears  
- IDE and terminal appear  
- User can start coding! 🎉  

These services are shared for both:

- Playgrounds  
- Projects  

(Details in **How Labs Run** section)

## 🎉 Step 16 – Playground Ready!

At this point:

- Live IDE is available  
- Terminal is active  
- User can run commands  
- Edit files  
- Start servers  
- Experiment freely  



## ⏱️ Performance

From clicking **Start Playground** to a fully working environment:

⏳ **Usually takes just 3–5 seconds**

Pretty fast, right? 😎



## 👾 And That’s the Full Story!

That’s the complete lifecycle of a DevsArena playground – from click to code.

<hr />
 <h3>🎬 Demos & What's Next?</h3>
<p>
  I'll be covering <b>Guided Projects</b>, <b>K8s</b>, and <b>Lab Cleanup</b> very soon! 
</p>
<p>
  In the meantime, check out the playgrounds and project demos below. They are short and to the point—just around 5 minutes (sadly, Loom wouldn't let me record more without paying 💸). 
</p>
<p>
  Since I'm not sure how long the free tier I'm operating on will survive, I've recorded the platform in action so you can see it live regardless!
</p>
  <br />

  <a href="https://www.loom.com/share/917a531a94274c96b5065b19570c3d05">
    <img src="https://img.shields.io/badge/Watch_Playground_Demo-625DF5?style=for-the-badge&logo=loom&logoColor=white" alt="Watch Playground Demo" />
  </a>

  &nbsp; &nbsp;

  <a href="https://www.loom.com/share/3eb55ffc77154c7dbc04c62f8f2d6d5c">
    <img src="https://img.shields.io/badge/Watch_Projects_Demo-625DF5?style=for-the-badge&logo=loom&logoColor=white" alt="Watch Projects Demo" />
  </a>
