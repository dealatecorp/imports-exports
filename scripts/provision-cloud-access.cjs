// One-time provisioning for the explicitly selected personal-demo project.
// Uses the installed Firebase CLI's authenticated client; credentials are never printed.
const fs=require('node:fs');
const path=require('node:path');
async function main(){
 const project='harbortrack-imports-exports',account='harbor-demo-server';
 const root=path.resolve('.firebase-cli-cache/_npx');
 const lib=fs.readdirSync(root).map(p=>path.join(root,p,'node_modules/firebase-tools/lib')).find(p=>fs.existsSync(path.join(p,'auth.js')));
 if(!lib)throw new Error('Install and sign in to the Firebase CLI first');
 const auth=require(path.join(lib,'auth.js')),options={project};
 const signedIn=auth.getGlobalDefaultAccount();
 if(signedIn?.user?.email!=='dealatecorp@gmail.com')throw new Error('The selected Firebase owner must be signed in');
 auth.setActiveAccount(options,signedIn);await require(path.join(lib,'requireAuth.js')).requireAuth(options);
 await require(path.join(lib,'ensureApiEnabled.js')).ensure(project,'iam.googleapis.com','iam');
 const iam=require(path.join(lib,'gcp/iam.js'));
 try{await iam.getServiceAccount(project,account);}catch(e){if(e.status!==404&&e.context?.response?.statusCode!==404&&e.context?.body?.error?.code!==404)throw e;await iam.createServiceAccount(project,account,'Firestore access for HarborTrack personal demo only','HarborTrack demo server');}
 await require(path.join(lib,'gcp/resourceManager.js')).addServiceAccountToRoles(project,account,['roles/datastore.user']);
 const folder=path.resolve('data/cloud-deployment');fs.mkdirSync(folder,{recursive:true});
 const output=path.join(folder,'service-account.json');
 if(fs.existsSync(output)){console.log('Existing private deployment credential retained.');return;}
 const {Client}=require(path.join(lib,'apiv2.js'));
 const client=new Client({urlPrefix:'https://iam.googleapis.com',apiVersion:'v1'});
 const response=await client.post(`/projects/${project}/serviceAccounts/${account}@${project}.iam.gserviceaccount.com/keys`,{privateKeyType:'TYPE_GOOGLE_CREDENTIALS_FILE',keyAlgorithm:'KEY_ALG_RSA_2048'},{skipLog:{reqBody:true,resBody:true}});
 fs.writeFileSync(output,Buffer.from(response.body.privateKeyData,'base64'),{flag:'wx',mode:0o600});
 console.log('Created project-scoped database access. Credential saved privately under ignored data directory.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
