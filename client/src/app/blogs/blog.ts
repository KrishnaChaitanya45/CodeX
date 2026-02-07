export type BlogAuthor = {
  name: string;
  title: string;
  avatar?: string;
  socials?: { label: string; href: string }[];
};

export type TextHighlight = {
  type: "link" | "highlight-marker" | "highlight-code";
  url?: string; // For links
  className?: string; // Custom class override
  once?: boolean; // If true, only highlighted (processed) the first time it appears
};

export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string; level?: 2 | 3 }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "quote"; text: string; caption?: string }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "divider" }
  | { type: "code"; text: string; language?: string }
  | { type: "callout"; title?: string; text: string; tone?: "info" | "success" | "warning" | "neutral" }
  | { type: "link"; label: string; href: string; description?: string };

export type BlogSection = {
  id: string;
  title: string;
  summary?: string;
  blocks: BlogBlock[];
  keywordMap?: Record<string, TextHighlight>; // Section-specific keywords
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  hero?: string;
  tags: string[];
  author: BlogAuthor;
  keywordMap: Record<string, TextHighlight>; // Map keyword/phrase -> highlight config
  sections: BlogSection[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "devsarena-journey",
    title: "DevsArena: Building a learning arena from scratch",
    description:
      "A candid, long-form look at how the idea started, what broke, and what kept me building.",
    date: "Feb 5, 2026",
    readTime: "12 min read",
    hero: "A builder's log from curiosity to platform.",
    tags: ["Curiosity", "Engineering", "Journey"],
    author: {
      name: "Krishna",
      title: "Fellow Curiosity Developer",
      avatar: "https://avatars.githubusercontent.com/u/96629150?v=4",
      socials: [
        { label: "Twitter", href: "https://x.com/KrishnaWyvern" },
        { label: "GitHub", href: "https://github.com/KrishnaChaitanya45" },
      ],
    },
    keywordMap: {
      "DevsArena": { type: "highlight-marker", once: true },
      "Boot.dev": { type: "link", url: "https://boot.dev", once: true },
      "freeCodeCamp": { type: "link", url: "https://www.freecodecamp.org", once: true },
      "Learning Go [Book]": { type: "link", url: "https://www.oreilly.com/library/view/learning-go/9781492077206", once: true },
      "Lane Wagner": { type: "highlight-code", once: true },
      "Roadmap.sh": { type: "link", url: "https://roadmap.sh", once: true },
      "Frontend Mentor": { type: "link", url: "https://www.frontendmentor.io", once: true },
      "Golang": { type: "highlight-code", once: true },
      "Microservices": { type: "highlight-code", once: true },
      "Cloudinary": { type: "link", url: "https://cloudinary.com", once: true },
      "Render": { type: "link", url: "https://render.com", once: true },
      "Repl.it": { type: "link", url: "https://replit.com", once: true },
      "this video from Harkirat Singh": { type: "link", url: "https://www.youtube.com/watch?v=s0kBqGpThp0&t=3s&pp=ygUVaGFya2lyYXQgc2luZ2ggcmVwbGl0", once: true },
      "codedamn.com": { type: "link", url: "https://codedamn.com", once: true },
      "github student developer pack": { type: "link", url: "https://education.github.com/pack", once: true },
      "this video by Piyush Garg": {type:"link", url:"https://www.youtube.com/watch?v=wcdaIQjtWQI&pp=ygUdcGl5dXNoIGdhcmcgdmlkZW8gdHJhbnNjb2Rpbmc%3D", once: true},
      "exercism.org": { type: "link", url: "https://exercism.org", once: true },
      "It's here in Github": { type: "link", url: "http://github.com/krishnachaitanya45/x-backend", once: true },
      "Next JS": { type: "highlight-code", once: true },
      "Lambda": { type: "highlight-code", once: true },
      "V0": { type: "highlight-marker", once: true },
      "[ well it's not really complete yet ]": { type: "highlight-marker", once: true },
      "collaborative learning": { type: "highlight-code", once: true },
      "Clash of Clans": { type: "highlight-marker", once: true },
      "DDIA book": {type:"link", url: "https://dataintensive.net/", once: true},
      "I usually do this, out of nowhere curiosity strikes in, regarding a project or a technology and I set out to explore it anyway.": {
        type: "highlight-code", once: true
      },
      "DSA" : {type:"highlight-marker", once: true},
      "System design" : {type:"highlight-marker", once: true},
      "Naive approaches": { type: "highlight-marker", once: true },
    },
    sections: [
      {
        id: "intro",
        title: "Introduction",
        summary: "The beginning of an exciting journey.",
        keywordMap: {
           "intrusive thoughts": { type: "highlight-marker" }
        },
        blocks: [
          {
            type: "paragraph",
            text: "The last 6 months have been exciting. Honestly, I have never spent so much time and interest on a product so far, this project [ DevsArena ] is very different from all the others which I've worked on before.",
          },
          {
            type: "paragraph",
            text: "So in this blog post, I would go through my entire journey [ well it's not really complete yet ], why did I set out to build this ? How did I build this ? Is the journey worth it ? basically everything that went in my head. Grab a coffee or something, sit tight ! It's a long story, but trust me you won’t get bored. You’ll get to know what happens if you let your intrusive thoughts, Naive approaches for problems are encouraged and worked up on.",
          }
        ]
      },
      {
        id: "how-it-started",
        title: "How did this start?",
        summary: "The early spark and the influence of Boot.dev.",
        blocks: [
          {
            type: "paragraph",
            text: "For a long time since back in my 3rd year of engineering, I wanted to build an LMS platform, I wanted it to be fun, engaging and intuitive. This idea was not just about a video streaming + assignment kind of LMS platform like the other ones in the market, where you watch a bunch of videos and answer a few MCQ questions to prove that you’ve finished the course.",
          },
          {
            type: "paragraph",
            text: "My idea was completely different, and one of the major reasons being that during that period of time I got exposed to Boot.dev. I was looking for a SQL tutorial online, and from freeCodeCamp, I got this tutorial on youtube where Lane Wagner ( founder of boot.dev ) used his platform for the tutorial and I was impressed with the platform and the idea. I wanted to understand how it was built, what goes behind these platforms.",
          },
          {
            type: "paragraph",
            text: "At that time i was working on as an intern and had a bit of exposure to the backend part as well, I was not very confident back then that i would set out to build this, because of two obvious reason, i dont have the knowledge to build such platform and secondly i cant teach people when i my self relay on resources with half knowledge from the crash courses.",
          },
          {
            type: "paragraph",
            text: "I wanted to give it a shot and explore it anyway, mostly my work was on the frontend side, so I wanted to explore the backend development. And for that i started by referring to Roadmap.sh. I used to refer to this when I was learning the frontend and web development in general, but this time when I opened. I noticed there was a section for projects.",
          },
          {
            type: "paragraph",
            text: "I referred to Frontend Mentor which had the challenges to learn frontend development and I got used to this format of learning, where we learn a concept, build a project on it and explore more. So having gotten used to this, I loved the fact that the backend road map i was referring to had projects in it.",
          },
          {
            type: "paragraph",
            text: "I started learning Golang at the time, so I tried to explore the roadmap alongside my golang journey. I was reading Learning Go [Book] and there was another successor book for this where we were building a project.",
          },
          {
            type: "paragraph",
            text: "When I was about to finish both the books, I was curious and wanted to understand how video streaming platforms work, this was something that stuck in my head out of nowhere. I referred to this video by Piyush Garg. To explore how it works and wanted to build this to dive deeper.",
          },
          {
            type: "paragraph",
            text: "I was not aware of free AWS credits and about the free cloud credits from Azure, Digital Ocean and so on for the github student pack. So I wanted to use the free resources which at that point I was used to using tools like Cloudinary for storage, Render for deploying and so on.",
          },
          {
            type: "paragraph",
            text: "I started to build the video transcoding service and at that time I used to explore microservices and how large systems are built and scaled, My feed was filled with this stuff and i’m always curious to understand how a product was built and scaled to a large number of users. So I tried to refer to system design videos and videos about microservices and Architectures for different products.",
          },
          {
            type: "paragraph",
            text: "Honestly at that point, I was not completely sure what a monolith was and never completely understood the limitations for it. But I was going with the flow anyway so I continued to build this transcoding service. It's here in Github. It all started with this project, i had a list of initial set of features and plans about this platform.",
          },
          {
            type: "paragraph",
            text: "I was mostly focussed on collaborative learning, where people build projects together. Me and my friends during the time were quite actively playing Clash of Clans. So I got an idea inspired from the game, that similar to clan wars, we would have a similar competition for projects in the platform where a group of people forming different teams would compete with each other on a set of problems.",
          },
          {
            type: "paragraph",
            text: "Honestly, now it feels dumb and idiotic but during that time it was all serious to me. So I built the basic version for video transcoding service, which basically takes a video, converts it into different formats and stores them in Cloudinary and we stream the video on a custom HLS player from our frontend. Now when i look at this platform i could identify some serious flaws and mistakes but at that point i was confident about this.",
          },
          {
            type: "paragraph",
            text: "Even though i didn’t deploy this, i tried to record a demonstration video and documented this.",
          },
          {
           type: "paragraph",
           text: "It was clear at that point that I would work on this platform, upload challenges and courses. In the code you could also find the models defined for them as well. Even though I never continued to build this project, I barely spent a month or two on this project. Eventually I got into my final year. Got placed and never spent time on this one."
          },
          {
            type: "paragraph",
            text: "After my graduation, and when things settled, I was back and started to explore and resume my learning journey, during this time. System design was getting heavily popular and I started reading DDIA book, which I think is still popular for distributed systems and system design."
          },
          {
             type: "paragraph",
             text: "But I was feeling bored by just reading stuff, and I thought maybe I'll start building something, start with a project, explore its limitations myself without having to read it anywhere like a manual and fix it myself. This time my focus was not on building a good project, I just wanted to learn on the way."
          },
          {
             type: "paragraph",
             text: "This time around, I was curious to understand how platforms like Repl.it works. I have been using this since my first year of college and never really cared about its working and internals, but I wanted to give this a shot this time."
          },
          {
             type: "paragraph",
             text: "I usually do this, out of nowhere curiosity strikes in, regarding a project or a technology and I set out to explore it anyway."
          },
          {
             type: "paragraph",
             text: "In Reddit, Twitter everywhere I observed that people are referring mostly to DSA and System design, both to level up themselves and prepare for interviews. DSA is never my thing, I try to sit and solve multiple times and I always lose interest instantly, it always feels like theory and never got any interest to solve the problems. And for the system design I thought of building something in order to truly understand what goes behind the systems."
          },
          {
             type: "paragraph",
             text: "The aim was clear: I was not interested in building a todo app, or any basic ones. I wanted to explore RSC and wanted to build a project around the same. During this time, I stumbled on this video from Harkirat Singh. Honestly this video was a masterpiece for me and I found this in the correct time when i wanted it. And this video honestly provided me with a kick start to this journey and it was very informative."
          },
          {
             type: "paragraph",
             text: "Basically Harkirat covers how systems like Repl.it works and how we can build a similar platform from scratch. Exactly something I was looking for. When i was exploring this, i was also curious to understand and wanted to relate this to codedamn.com which is another resource i referred back in the days for the backend development. They have projects and playgrounds where they let you write the code and execute tests on them. Exactly what devsarena lets you do now."
          },
          {
             type: "paragraph",
             text: "I got to know that the github student developer pack includes the credits for Digital Ocean and Azure, so I claimed that and started to work on the project. This time I was really excited that I could deploy this project unlike other ones."
          }
        ],
        keywordMap: {
            "System design": { type: "highlight-marker" },
            "Exactly what devsarena lets you do now.": { type: "highlight-code" }
        }
      },
      {
        id: "idea-origin",
        title: "Where does the idea come from?",
        summary: "Connecting the dots between learning platforms.",
        blocks: [
          {
            type: "paragraph",
            text: "This time around when I was ready to build a project, I did initially start to think and plan on continuing my old idea of LMS platform, but something fell off. I was not very confident on that idea, I was constantly exploring this space and I found multiple resources and platforms, like exercism.org, which is another similar platform which teaches you skills in a practical way."
          },
          {
            type: "paragraph",
            text: "So I liked this idea of project based learning from multiple platforms like codedamn, boot.dev, exercism and so on. And I thought I'll give this a shot. During this time, I was actively discussing my thoughts, plans and ideas with one of my friends. And when we came up with this idea of project based learning where we break a problem into multiple manageable checkpoints and work on them individually, he was equally interested and confident in the idea. Even though this is not something entirely new, it was fun for us to explore what goes behind building such platforms. Honestly, I was not expecting anything out of this project, except for the learning experience. As i was quite sure, that this wouldn’t end up being a paid project or something i would sell and make money out of this. [ We never know 😉 ]"
          },
          {
            type: "paragraph",
            text: "There was another friend of mine, who was building a platform where he could link to all the resources and assignments that he referred to in this learning journey, so basically he was into web and mobile. So he created a road map sort of thing, where he wanted to cover a structured road map for different career options, like he at that time covered the web development roadmap, which included links to videos and assignments in the form of MCQ’s. Which at that point of time was exciting for me, because i was focussing a platform which is dedicated to the projects and assignments, as we would have the sandbox environments for it, so i thought it would be a complete platform, if we have both content for learning [ from youtube videos, blogs and custom videos if we set out to make those ] and also the assignments from DevsArena. So i started to build this as a B2B service [ barely knew what it was back in the time 👽, STRONG AND BIG NAMES, IF IT SOUNDS GOOD => WORK ! ]"
          }
        ],
        keywordMap:{
            "project based learning": { type: "highlight-marker", once:true },
            "[ We never know 😉 ]" : {type:"highlight-marker"},
            "[ barely knew what it was back in the time 👽, STRONG AND BIG NAMES, IF IT SOUNDS GOOD => WORK ! ]" : {type:"highlight-code"}  
        }
      },
      {
        id: "the-v0",
        title: "The V0",
        summary: "The initial architecture and the 'Next JS App' plan.",
        blocks: [
          {
            type: "paragraph",
            text: "I guess I started to work and build this back in June or July, so initially I wanted to have this infra layer for code execution, and this time as I was thinking of making this for my friends platform, I first wanted to build a v0 for this to demonstrate the idea."
          },
          {
            type: "paragraph",
            text: "The plan was simple, we would give a link to embed in his platform, the link would be unique for a project, so it would be something like https://devsarena.in/project/[language]/[projectName]. So it takes us to our platform where we would be displaying the IDE and the checkpoints UI. For every project, you get requirements, which are high level. Like lets say for a todo list, it would be like building a todo list application, which allows us to add the todos, delete the todos and edit the todos, and the todos should be persisted on reload. So the requirements would not be completely clear, and we would be having multiple checkpoints where each checkpoint focuses on individual features or just a tiny part of the project. So each checkpoint has some clear requirements, like creating an input with id todo-input, and so on, which basically practically guides the user and helps us to ensure that the user code is in a way that’s predictable and we can look out for those elements and stuff from our tests."
          },
          {
            type: "paragraph",
            text: "Each checkpoint would consist of tests, this tests would be run for each checkpoints to ensure the code is correct and works as expected based on the checkpoint requirements."
          },
          {
            type: "image",
            src: "/blog/v0-high-level-steps.png",
            alt: "Steps in higher level - Flowchart showing how a user selects a problem and works through checkpoints",
            caption: "The initial flowchart we brainstormed: Breaking problems into checkpoints and hidden tests."
          },
           {
            type: "paragraph",
            text: "I’ve attached the image above, even though we changed a lot from the idea, but this was exactly what we discussed, me and my friend when we were brainstorming our idea on how to make this work. I did cut a lot of features from there, hint part, articulating problem and so on, to make it simple for the v0."
          },
           {
            type: "paragraph",
            text: "And out of this high level plan, I wanted to focus on architecture, it was all fun for me, because i never really did this stuff, i did plan out and work on projects before, but this time around it was something new, because all the projects i worked before were more or less the similar ones which i could find in youtube or somewhere and that would provide me with the kickstart, but this time i thought may be i’ll take time and think for myself. There was no hurry to rush and build this, as for me the main focus was learning."
          },
          {
            type: "paragraph",
            text: "My friend was using Render to deploy his backend, because that was something we were used to because of youtube tutorials and so on, and we never really went for AWS or other platforms. Render for the free tier, has a horrible response time for the api’s. It usually takes more than 5 seconds to respond and it's always frustrating even as a developer when we work on our project. But anyway I wanted to build this for free, because it’s just a prototype. I bought this domain during this time around."
          },
          {
             type: "paragraph",
             text: "I explored lambda and serverless at that time, i knew what it was because i had to prepare the theory for AWS services for interviews, but honestly never used it before. So I thought I would give this a shot. As the free limit for lambda is around 1 million free requests. That’s still more than enough for me. So i started to plan the architecture around lambda this time."
          },
          {
             type: "image",
             src: "/blog/v0-architecture-flow.png",
             alt: "Architecture Diagram - B2B client to NextJS app to Lambda",
             caption: "The ambitious architecture: Proxied requests, Lambdas, and synchronous flows for a B2B V0."
          },
          {
             type: "paragraph",
             text: "I came up with this plan as shown in the above picture, it was simple. I had to create two different endpoints, one for getting multiple projects, and another for getting a single project based on the ID or slug."
          },
          {
             type: "paragraph",
             text: "When we send a request for a single project from our next js backed, we would be calling a lambda service, which connects to our DB which is PSQL hosted in Supabase. So this would have both the boiler plate code links and the test links. The code and test files were hosted in S3 back then and the object links were stored in the DB. We return the project details, the code and test files presign links to the s3 back to the client."
          },
          {
             type: "paragraph",
             text: "This files were then loaded in the monaco editor in our frontend and the code for tests were usually appended at the end of the user code. So basically as shown below"
          },
          {
             type: "code",
             text: "<html>\n<body>\n// USER CODE HERE\n// Test code for the select checkpoint appended at the end, when the user clicks on Test.\n</body>\n</html>",
             language: "html"
          },
          {
             type: "paragraph",
             text: "Basically I used an iframe to preview the user code. So the user source code was directly mapped to the iframe source so the preview was instantaneous. This was something I copied from codepen.io. And all the test files were loaded and stored on the client side in a folder. [ very rookie approach indeed ! ]."
          },
          {
             type: "paragraph",
             text: "So when a user clicks on Test, we take the test file for that checkpoint, we append it to the end of the user source code and we execute it to get the results. You can find this masterpiece here 🙂"
          },
          {
             type: "paragraph",
             text: "I preserved the code for v0, just in case 😅, To be clear this was all in a week, so alongside my work. I built this v0 version, deployed this and it was up and running in a week. I also added a new route, /project/add, to add a project which takes the code, creates a new file, for the boiler plate as it was just html, css and js. I used to zip these files in the server and add this to s3, and add the reference for it in PSQL."
          },
          {
             type: "paragraph",
             text: "For the client side, I extensively used AI and this resulted in such a mess and bloated codebase for the client. So many files, unnecessary lines of code. Sloppy UI and so on."
          }
        ],
        keywordMap:{
            "https://devsarena.in/project/[language]/[projectName]": {type:"highlight-code"},
            "I wanted to build this for free": {type:"highlight-code"},
            "free limit for lambda is around 1 million free requests.": {type:"highlight-code"},
            "Supabase": {type:"highlight-marker"},
            "codepen.io": {type:"link", url:"https://codepen.io"},
            "[ very rookie approach indeed ! ]": {type:"highlight-marker"},
            "this masterpiece here": {type:"link", url:"https://github.com/KrishnaChaitanya45/CodeX/blob/v0/client/src/utils/testRunner.ts"},
            "/project/add": {type:"highlight-code"}
        }
      },
      {
        id: "to-be-continued",
        title: "Yet to be continued",
        summary: "The story is still unfolding. And i'm too lazy",
        blocks: [
          {
            type: "callout",
            text: "I’ll keep updating this as I ship new milestones and features. If you want to follow along, keep an eye on DevsArena and the GitHub repo.",
            tone: "neutral",
          },
        ],
      },
    ],
  },
];
