import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as std from "@pulumi/std";

const projectId = "develop-436107";

const github_token_secret = new gcp.secretmanager.Secret("github-pat-secret", {
  secretId: "github-pat-secret",
  replication: {
    userManaged: {
      replicas: [{ location: "asia-northeast1" }],
    },
  },
});
const github_token_secret_version = new gcp.secretmanager.SecretVersion(
  "github-pat-secret-version",
  {
    secret: github_token_secret.id,
    secretData: std
      .file({
        input: "secrets/github-token.txt",
      })
      .then((invoke) => invoke.result),
  }
);
const database_url = new gcp.secretmanager.Secret("database-url", {
  secretId: "database-url",
  replication: {
    userManaged: {
      replicas: [{ location: "asia-northeast1" }],
    },
  },
});
const database_url_version = new gcp.secretmanager.SecretVersion(
  "database-url-version",
  {
    secret: database_url.id,
    secretData: std
      .file({
        input: "secrets/database-url.txt",
      })
      .then((invoke) => invoke.result),
  }
);
const cloudbuild_service_account = new gcp.serviceaccount.Account(
  "cloudbuild_service_account",
  {
    accountId: "cloudbuild-sa",
    displayName: "cloudbuild-sa",
    description: "Cloud build service account",
  }
);

new gcp.secretmanager.SecretIamMember("member", {
  project: github_token_secret.project,
  secretId: github_token_secret.secretId,
  role: "roles/secretmanager.secretAccessor",
  member: cloudbuild_service_account.email.apply(
    (email) => `serviceAccount:${email}`
  ),
});

new gcp.secretmanager.SecretIamMember("database-url-policy", {
  project: database_url.project,
  secretId: database_url.secretId,
  role: "roles/secretmanager.secretAccessor",
  member: cloudbuild_service_account.email.apply(
    (email) => `serviceAccount:${email}`
  ),
});
const iamServiceAccountUserBinding = new gcp.projects.IAMBinding(
  "iamServiceAccountUserBinding",
  {
    role: "roles/iam.serviceAccountUser",
    project: projectId,
    // members: [cloudbuild_service_account.email],
    members: [
      pulumi.interpolate`serviceAccount:${cloudbuild_service_account.email}`,
    ],
  }
);

// Assign the roles/logging.logWriter role to the service account
const iamLogWriterBinding = new gcp.projects.IAMBinding("iamLogWriterBinding", {
  role: "roles/logging.logWriter",
  project: projectId,
  // members: [cloudbuild_service_account.email],
  members: [
    pulumi.interpolate`serviceAccount:${cloudbuild_service_account.email}`,
  ],
});
// Cloud Build サービス アカウントロールを付与
const cloudBuildIamBinding = new gcp.projects.IAMBinding(
  "cloudBuildIamBinding",
  {
    members: [
      pulumi.interpolate`serviceAccount:${cloudbuild_service_account.email}`,
    ],
    role: "roles/cloudbuild.builds.builder", // Cloud Build サービス アカウントロール
    project: projectId,
  }
);

// Cloud Run 管理者ロールを付与
const cloudRunIamBinding = new gcp.projects.IAMBinding("cloudRunIamBinding", {
  members: [
    pulumi.interpolate`serviceAccount:${cloudbuild_service_account.email}`,
  ],
  role: "roles/run.admin", // Cloud Run 管理者ロール
  project: projectId,
});
// new gcp.serviceaccount.IAMMember("act_as", {
//   // project : projectId,
//   role: "roles/iam.serviceAccountUser",
//   member: cloudbuild_service_account.email.apply(email => `serviceAccount:${email}`),
//   serviceAccountId: cloudbuild_service_account.email.apply(email => `projects/${projectId}/serviceAccounts/${email}`),
// });
// // new gcp.cloudbuild.

// new gcp.serviceaccount.IAMMember("logs_writer", {
//   // project : projectId,
//   role: "roles/logging.logWriter",
//   member: cloudbuild_service_account.email.apply(email => `serviceAccount:${email}`),
//   serviceAccountId: cloudbuild_service_account.email.apply(email => `projects/${projectId}/serviceAccounts/${email}`),
// });
const my_repo = new gcp.artifactregistry.Repository("cloud-run-source-deploy", {
  location: "asia-northeast1",
  repositoryId: "cloud-run-source-deploy",
  description: "example docker repository",
  format: "DOCKER",
  dockerConfig: {
    immutableTags: true,
  },
});
const my_connection = new gcp.cloudbuildv2.Connection(
  "default",
  {
    githubConfig: {
      appInstallationId: 54910727,
      authorizerCredential: {
        // oauthTokenSecretVersion:
        //   "projects/develop-436107/secrets/cloud-run-remix-github-oauthtoken-233bd5/versions/latest",
        oauthTokenSecretVersion: github_token_secret_version.name,
      },
    },
    // location: "asia-northeast1",
    location: "us-central1",

    name: "cloud-run-remix",
    project: projectId,
  }
  //   {
  //     protect: true,
  //   }
);
// const my_connection = new gcp.cloudbuildv2.Connection("my-connection", {
//   location: "asia-northeast1",
//   name: "my-connection",
//   githubConfig: {
//     appInstallationId: 54910727,
//     authorizerCredential: {
//       oauthTokenSecretVersion: github_token_secret_version.name,
//     },
//   },
// });
// console.log("my_connection", my_connection.name);
// console.log("github_token_secret_version", github_token_secret_version.name);
const cloudRunRemixRepo = new gcp.cloudbuildv2.Repository(
  "sendo-kakeru",
  {
    // location: "asia-northeast1",
    location: "us-central1",

    name: "remix-docker-distroless",
    parentConnection: my_connection.id,
    // parentConnection: "cloud-run-remix",
    project: projectId,
    remoteUri: "https://github.com/sendo-kakeru/remix-docker-distroless.git",
  }
);

new gcp.cloudrun.IamMember("allUsers", {
  service: "pulumi-cloud-run",
  location: "asia-northeast1",
  role: "roles/run.invoker",
  member: "allUsers",
});

const trigger = new gcp.cloudbuild.Trigger("trigger", {
  filename: "cloudbuild.yaml",
  location: "us-central1",
  name: "remix",
  project: "develop-436107",
  repositoryEventConfig: {
      push: {
          branch: "^main$",
      },
      repository: "projects/develop-436107/locations/us-central1/connections/cloud-run-remix/repositories/remix-docker-distroless",
  },
  serviceAccount: "projects/develop-436107/serviceAccounts/cloudbuild-sa@develop-436107.iam.gserviceaccount.com",
}, {
  // protect: true,
});
// const build_trigger = new gcp.cloudbuild.Trigger("build-trigger", {
//   name: "my-trigger",
//   // location: "global",
//   location: "us-central1",
//   // location: "asia-northeast1",
//   // github: {
//   //   name: "cloud-run-remix",
//   //   owner: "sendo-kakeru",
//   //   push: {
//   //     branch: "^main$",
//   //   },
//   // },
//   repositoryEventConfig: {
//     // repository: `projects/${projectId}/locations/asia-northeast1/connections/cloud-run-remix/repositories/sendo-kakeru-cloud-run-remix`,
//     repository: cloudRunRemixRepo.id,
//     push: {
//       branch: "^main$",
//     },
//   },
//   project: projectId,
//   //   serviceAccount: `projects/${projectId}/serviceAccounts/${cloudbuild_service_account.email}`,
//   serviceAccount:
//     "projects/develop-436107/serviceAccounts/cloudbuild-sa@develop-436107.iam.gserviceaccount.com",
//   // cloudbuild_service_account.id,
//   substitutions: {
//     _AR_HOSTNAME: "asia-northeast1-docker.pkg.dev",
//     _DEPLOY_REGION: "asia-northeast1",
//     _PLATFORM: "managed",
//     _SERVICE_NAME: "pulumi-cloud-run",
//     _TRIGGER_ID: "a62cb1db-f746-4fbd-9658-37cbe0f1f505",
//     PROJECT_ID: projectId,
//   },
//   filename: "cloudbuild.yaml",
//   // filename: "pulumi/cloudbuild.yaml",
// });