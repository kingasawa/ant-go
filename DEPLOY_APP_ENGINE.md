# App Engine + Cloud Build Trigger

## 1) Runtime
`app.yaml` uses Node.js 24 (`runtime: nodejs24`).

## 2) Create/update secret
```bash
gcloud secrets create FIREBASE_ADMIN_CREDENTIALS_JSON --replication-policy=automatic
gcloud secrets versions add FIREBASE_ADMIN_CREDENTIALS_JSON --data-file=firebase-credentials.json
```

If the secret already exists, run only:
```bash
gcloud secrets versions add FIREBASE_ADMIN_CREDENTIALS_JSON --data-file=firebase-credentials.json
```

## 3) Create trigger
```bash
PROJECT_ID=ant-go \
REGION=asia-southeast1 \
CONNECTION=<cloud-build-connection-name> \
REPOSITORY=ant-go \
BRANCH_REGEX='^main$' \
TRIGGER_NAME='ant-go-appengine-main' \
./scripts/create-cloudbuild-trigger.sh
```

Create `CONNECTION` + `REPOSITORY` in Cloud Build first (Console -> Cloud Build -> Repositories).

## 4) Trigger substitutions
Set these substitutions in the trigger:
- `_NEXT_PUBLIC_FIREBASE_API_KEY`
- `_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `_NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `_NEXT_PUBLIC_FIREBASE_APP_ID`

## 5) Manual build test
```bash
gcloud builds submit --config cloudbuild.appengine.yaml --project=ant-go \
  --substitutions=_NEXT_PUBLIC_FIREBASE_API_KEY='<value>',_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN='eba-cli.firebaseapp.com',_NEXT_PUBLIC_FIREBASE_PROJECT_ID='eba-cli',_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET='eba-cli.firebasestorage.app',_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID='81305283947',_NEXT_PUBLIC_FIREBASE_APP_ID='1:81305283947:web:8f21e5bb1e82225160f02e'
```


