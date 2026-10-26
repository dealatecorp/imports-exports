import {applicationDefault,cert,getApps,initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

export function firebaseDatabase(){
 const projectId=process.env.FIREBASE_PROJECT_ID;
 if(!projectId)throw new Error('FIREBASE_PROJECT_ID is required');
 const name='harbor-server';let app=getApps().find(a=>a.name===name);
 if(!app){
  const credential=process.env.FIREBASE_SERVICE_ACCOUNT_JSON?cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)):applicationDefault();
  app=initializeApp({projectId,credential},name);
 }
 return getFirestore(app);
}
