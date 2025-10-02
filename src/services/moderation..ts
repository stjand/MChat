// // src/services/moderation.ts
// import OpenAI from 'openai';

// const openai = new OpenAI({
//   apiKey: import.meta.env.VITE_OPENAI_API_KEY,
// });

// export async function moderateContent(text: string): Promise<boolean> {
//   try {
//     const moderation = await openai.moderations.create({
//       input: text,
//     });

//     return moderation.results[0].flagged;
//   } catch (error) {
//     console.error('Moderation error:', error);
//     return false; // Allow if moderation fails
//   }
// }

// // Example usage:
// export async function validateMessage(newMessage: string): Promise<boolean> {
//   const isFlagged = await moderateContent(newMessage);
//   if (isFlagged) {
//     alert('Message contains inappropriate content');
//     return false;
//   }
//   return true;
// }