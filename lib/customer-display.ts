// Preserve saved records while retiring the old labels in the interface.
export function customerDisplayName(name:string){return name==='Demo Customer'?'Customer':name;}
export function bookingDisplayStatus(status:string){return status==='Paid (demo)'?'Payment approved':status;}

export function customerUpdateText(message:string){
 const previousMessages:Record<string,string>={
  'Your quote is ready. Complete demo checkout to submit your order. No real money will be charged.':'Your quote is ready. Complete checkout to submit your order. No real money will be charged.',
  'Demo payment declined. You can retry checkout. No money was charged.':'Test payment declined. You can retry checkout. No money was charged.',
  'Demo checkout cancelled. No money was charged.':'Checkout cancelled. No money was charged.',
 };
 if(previousMessages[message])return previousMessages[message];
 if(/^Demo payment approved\. Order \d+ is confirmed and ready for the operations team\. No money was charged\.$/.test(message))return message.replace(/^Demo payment approved\./,'Test payment approved.');
 return message;
}
