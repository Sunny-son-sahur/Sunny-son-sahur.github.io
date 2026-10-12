export const categories=['Game Bug','Game Request','Account Help','Report Someone','Other'];
export const ticketHints={
 'Game Bug':{subject:'Which game is having a problem?',description:'What were you doing? What did you expect to happen, and what happened instead?'},
 'Game Request':{subject:'What game would you like us to add?',description:'Tell us about the game and why you want it added.'},
 'Account Help':{subject:'What do you need help with on your account?',description:'Describe the account issue and when it started. Never include your password or sign-in codes.'},
 'Report Someone':{subject:'Who are you reporting?',description:'Include their username, what happened, and where it happened. A screenshot can help, but is optional.'},
 'Other':{subject:'What can we help you with?',description:'Tell us what you need help with and any details that would help us understand.'}
};
export function validTicket(data){return categories.includes(data.category)&&typeof data.subject==='string'&&data.subject.trim().length>=3&&data.subject.length<=100&&typeof data.description==='string'&&data.description.trim().length>=10&&data.description.length<=3000}
export function staffRole(role){return ['admin','support'].includes(role)}
