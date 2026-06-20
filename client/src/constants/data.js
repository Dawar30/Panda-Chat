const pinnedThreads = [
  {
    id: "pinned-james",
    name: "James Walker",
    caseName: "Mitchell v. Harbor Properties",
    time: "2m",
    message: "I've drafted the settlement proposal based on repair estimates.",
    avatarSrc: "/images/man1.jpg",
    unread: true,
    active: true,  },
  {
    id: "pinned-elena",
    name: "Elena Rodriguez",
    caseName: "Mitchell Family Trust",
    time: "10m",
    message: "The trust documents are ready for review.",
    avatarSrc: "/images/female.jpg",
    unread: true,
    active: false,
    notification: 3,
  },
  {
    id: "pinned-billing",
    name: "cost Department",
    caseName: "General",
    time: "3h",
    message: "Your payment was received. Thank you.",
    avatarSrc: "/images/man2.jpg",
    unread: false,
    active: false,
  }
];

const chatData = {
  "pinned-james": [
    {
      id: "msg-1",
      sender: "them",
      name: "Walker",
      time: "10:52 AM",
      text: "Hi Naushad, I've been reviewing the inspection report in detail. There are several key findings that strengthen our case.",
      avatarSrc: "/images/man1.jpg",
    },
    {
      id: "msg-2",
      sender: "me",
      time: "10:54 AM",
      text: "That's great to hear. What are the main points?",
    },
    {
      id: "msg-3",
      sender: "them",
      name: "Walker",
      time: "10:57 AM",
      text: "The report identifies three structural issues that were present at the time of sale:",
      details: [
        "Foundation cracking in the east wall",
        "Water damage in the basement",
        "Outdated electrical wiring",
      ],
      avatarSrc: "/images/man1.jpg",
    },
    {
      id: "msg-4",
      sender: "me",
      time: "11:02 AM",
      text: "This is very helpful. Do we have estimates for the repair cost?",
    },
    {
      id: "msg-5",
      sender: "them",
      name: "Walker",
      time: "11:06 AM",
      text: "I've drafted the settlement proposal based on repair estimates totaling $47,500. Please review when you can. I'll send the document shortly.",
      avatarSrc: "/images/man1.jpg",
    },
  ],
  "pinned-elena": [
    {
      id: "msg-1",
      sender: "them",
      name: "Elena",
      time: "9:30 AM",
      text: "Good morning! The trust documents are ready for your review.",
      avatarSrc: "/images/female.jpg",
    },
    {
      id: "msg-2",
      sender: "me",
      time: "9:35 AM",
      text: "Great! I'll review them today.",
    },
    {
      id: "msg-3",
      sender: "them",
      name: "Elena",
      time: "9:40 AM",
      text: "Perfect. Let me know if you have any questions.",
      avatarSrc: "/images/female.jpg",
    },
  ],
  "pinned-billing": [
    {
      id: "msg-1",
      sender: "them",
      name: "Billing",
      time: "Yesterday",
      text: "Your invoice for this month is ready.",
      avatarSrc: "/images/man2.jpg",
    },
  ],
  "pinned-lissa": [
    {
      id: "msg-1",
      sender: "them",
      name: "Maintain",
      time: "3h",
      text: "Your payment was received. Thank you.",
      avatarSrc: "/images/man2.jpg",
    },
  ],
};

export { pinnedThreads, chatData };