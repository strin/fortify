export interface MessageData {
  id?: number;
  name: string;
  isMessage?: boolean;
  createdAt?: Date;
  profileImageUrl?: string;
  content?: string;
  callDuration?: number;
  numberUnreadMessages?: number;
}

export interface Message {
  id?: number;
  isSender?: boolean;
  message?: string;
  isMessage?: boolean;
  createdAt: Date;
  callDuration?: number;
}

export const MESSAGE_DATA: MessageData[] = [
  {
    id: 1,
    name: "Alexander",
    isMessage: true,
    createdAt: new Date("2024-11-29T12:00:00"),
    profileImageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dXNlcnxlbnwwfHwwfHx8MA%3D%3D",
    content: "Hello, world!",
  },
  {
    id: 2,
    name: "Sandra Henderson",
    isMessage: false,
    createdAt: new Date("2024-11-28T14:30:00"),
    profileImageUrl:
      "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500",
    callDuration: 30,
    numberUnreadMessages: 2,
  },
  {
    id: 3,
    name: "Harland James",
    isMessage: true,
    createdAt: new Date("2022-01-03T16:00:00"),
    profileImageUrl:
      "https://media.sproutsocial.com/uploads/2022/06/profile-picture.jpeg",
    content: "Hi, I'm here!",
  },
  {
    id: 4,
    name: "Harland James",
    isMessage: false,
    createdAt: new Date("2022-01-04T18:30:00"),
    profileImageUrl:
      "https://png.pngtree.com/thumb_back/fh260/background/20230614/pngtree-woman-in-sunglasses-standing-in-front-of-a-dark-background-image_2891237.jpg",
    callDuration: 15,
    numberUnreadMessages: 0,
  },
  {
    id: 5,
    name: "Harland James",

    isMessage: true,
    createdAt: new Date("2022-01-05T20:00:00"),
    profileImageUrl:
      "https://imgv3.fotor.com/images/blog-cover-image/10-profile-picture-ideas-to-make-you-stand-out.jpg",
    content: "Bye, world!",
  },
  {
    id: 6,
    name: "Harland James",

    isMessage: false,
    createdAt: new Date("2022-01-06T22:30:00"),
    profileImageUrl:
      "https://st4.depositphotos.com/12982378/30287/i/450/depositphotos_302876834-stock-photo-beautiful-smiling-girl-isolated-pink.jpg",
    callDuration: 45,
    numberUnreadMessages: 1,
  },
  {
    id: 7,
    name: "Harland James",

    isMessage: true,
    createdAt: new Date("2022-01-07T00:00:00"),
    profileImageUrl:
      "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500",
    content: "Nice to meet you!",
  },
  {
    id: 8,
    name: "Harland James",

    isMessage: false,
    createdAt: new Date("2022-01-08T02:30:00"),
    profileImageUrl:
      "https://st4.depositphotos.com/12982378/30287/i/450/depositphotos_302876834-stock-photo-beautiful-smiling-girl-isolated-pink.jpg",
    callDuration: 20,
    numberUnreadMessages: 3,
  },
  {
    id: 9,
    name: "Harland James",
    isMessage: true,
    createdAt: new Date("2022-01-09T04:00:00"),
    profileImageUrl:
      "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500",
    content: "How are you today?",
  },
];

export const MESSAGES: Message[] = [
  {
    id: 1,
    isSender: true,
    isMessage: true,
    message: "Hi, How are you?",
    createdAt: new Date("2024-11-29T12:00:00"),
  },
  {
    id: 2,
    isSender: false,
    isMessage: true,
    message: "I'm doing well, thank you. How about you?",
    createdAt: new Date("2024-11-29T12:10:00"),
  },
  {
    id: 3,
    isSender: true,
    isMessage: true,
    message: "I'm also good, just busy with work. How about you?",
    createdAt: new Date("2024-11-29T12:20:00"),
  },
  {
    id: 4,
    isSender: false,
    isMessage: true,
    message: "I'm also doing well. Did you finish your homework?",
    createdAt: new Date("2024-11-29T12:30:00"),
  },
  {
    id: 5,
    isSender: true,
    isMessage: true,
    message:
      "Yes, I did. It was quite challenging, but I'm glad I managed to finish it.",
    createdAt: new Date("2024-11-29T12:40:00"),
  },
  {
    id: 6,
    isSender: false,
    isMessage: false,
    callDuration: 30,
    createdAt: new Date("2024-11-29T12:50:00"),
  },
  {
    id: 7,
    isSender: true,
    isMessage: true,
    message: "Great! I'm glad you enjoyed it. Have a great day!",
    createdAt: new Date("2024-11-29T13:00:00"),
  },
];

export function categorizeMessagesByDay() {
  const messagesByDay = MESSAGES.reduce(
    (acc, message) => {
      const day = message.createdAt.toISOString().split("T")[0];
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(message);
      return acc;
    },
    {} as Record<string, Message[]>
  );

  return messagesByDay;
}
