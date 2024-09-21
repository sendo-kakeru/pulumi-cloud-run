import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as std from "@pulumi/std";

const projectId = "develop-436107";

// const repository = new gcp.sourcerepo.Repository("my-repo", {
//     name: "my-repo",
// });

// const buildTrigger = new gcp.cloudbuild.Trigger("build-trigger", {
//     name: "build-trigger",
//     triggerTemplate: {
//         branchName: "main",
//         repoName: repository.name,
//     },
//     build: {
//         steps: [{
//             name: "gcr.io/cloud-builders/docker",
//             args: ["build", "-t", "gcr.io/$PROJECT_ID/my-app:$COMMIT_SHA", "."],
//         }],
//         images: ["gcr.io/$PROJECT_ID/my-app:$COMMIT_SHA"],
//     },
// });

// const cloudRunService = new gcp.cloudrun.Service("my-service", {
//     location: "asia-northeast1",
//     template: {
//         spec: {
//             containers: [{
//                 image: pulumi.interpolate`gcr.io/${gcp.config.project}/my-app:${buildTrigger.build?.images?.[0]}`,
//             }],
//         },
//     },
//     traffics: [{
//         percent: 100,
//         latestRevision: true,
//     }],
// });

// const _default = new gcp.cloudrun.Service("default", {
//   name: "cloud-run-service-name",
//   location: "asia-northeast1",
//   template: {
//     spec: {
//       containers: [
//         {
//           image: "gcr.io/cloudrun/hello",
//         },
//       ],
//     },
//   },
//   traffics: [
//     {
//       percent: 100,
//       latestRevision: true,
//     },
//   ],
// });
// const sa = new gcp.serviceaccount.Account("sa", {
//   accountId: "cloud-run-pubsub-invoker",
//   displayName: "Cloud Run Pub/Sub Invoker",
// });
// const binding = new gcp.cloudrun.IamBinding("binding", {
//   location: _default.location,
//   service: _default.name,
//   role: "roles/run.invoker",
//   members: ["allUsers"],
// });
// const project = new gcp.projects.IAMBinding("project", {
//   role: "roles/iam.serviceAccountTokenCreator",
//   members: [pulumi.interpolate`serviceAccount:${sa.email}`],
//   project: "develop-436107",
// });
// const topic = new gcp.pubsub.Topic("topic", { name: "pubsub_topic" });
// const subscription = new gcp.pubsub.Subscription("subscription", {
//   name: "pubsub_subscription",
//   topic: topic.name,
//   pushConfig: {
//     pushEndpoint: _default.statuses.apply((statuses) => statuses[0].url),
//     oidcToken: {
//       serviceAccountEmail: sa.email,
//     },
//     attributes: {
//       "x-goog-version": "v1",
//     },
//   },
// });

// new gcp.projects.Service("project", {
//   project: "develop-436107",
//   service: "iam.googleapis.com",
//   disableOnDestroy: false,
// });

//   let github_token_secret: gcp.secretmanager.GetSecretResult;
//   const github_token_secret = await gcp.secretmanager.getSecretVersion({
//     secret: "github-pat-secret",

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
const member = new gcp.secretmanager.SecretIamMember("member", {
  project: github_token_secret.project,
  secretId: github_token_secret.secretId,
  role: "roles/secretmanager.secretAccessor",
  member:
    "serviceAccount:service-1022174569886@gcp-sa-cloudbuild.iam.gserviceaccount.com",
});

const cloudbuild_service_account = new gcp.serviceaccount.Account(
  "cloudbuild_service_account",
  {
    accountId: "cloudbuild-sa",
    displayName: "cloudbuild-sa",
    description: "Cloud build service account",
  }
);
const iamServiceAccountUserBinding = new gcp.projects.IAMBinding("iamServiceAccountUserBinding", {
    role: "roles/iam.serviceAccountUser",
    project: projectId,
    // members: [cloudbuild_service_account.email],
    members: [pulumi.interpolate`serviceAccount:${cloudbuild_service_account.email}`],
});

// Assign the roles/logging.logWriter role to the service account
const iamLogWriterBinding = new gcp.projects.IAMBinding("iamLogWriterBinding", {
    role: "roles/logging.logWriter",
    project: projectId,
    // members: [cloudbuild_service_account.email],
    members: [pulumi.interpolate`serviceAccount:${cloudbuild_service_account.email}`],
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
    location: "asia-northeast1",
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
    location: "asia-northeast1",
    name: "remix-docker-distroless",
    parentConnection: my_connection.id,
    // parentConnection: "cloud-run-remix",
    project: projectId,
    remoteUri: "https://github.com/sendo-kakeru/remix-docker-distroless.git",
  },
//   {
//     protect: true,
//   }
);
// const my_repository = new gcp.cloudbuildv2.Repository("my-repository", {
//   location: "asia-northeast1",
//   name: "my-repository",
//   parentConnection: my_connection.id,
//   remoteUri: "https://github.com/sendo-kakeru/pulumi-cloud-run.git",
// });
// console.log("cloudbuild_service_account", cloudbuild_service_account);

const build_trigger = new gcp.cloudbuild.Trigger("build-trigger", {
  name: "my-trigger",
  // location: "global",
  location: "asia-northeast1",
  // github: {
  //   name: "cloud-run-remix",
  //   owner: "sendo-kakeru",
  //   push: {
  //     branch: "^main$",
  //   },
  // },
  repositoryEventConfig: {
    // repository: `projects/${projectId}/locations/asia-northeast1/connections/cloud-run-remix/repositories/sendo-kakeru-cloud-run-remix`,
    repository: cloudRunRemixRepo.id,
    push: {
      branch: "^main$",
    },
  },
  project: projectId,
  //   serviceAccount: `projects/${projectId}/serviceAccounts/${cloudbuild_service_account.email}`,
  serviceAccount:
    "projects/develop-436107/serviceAccounts/cloudbuild-sa@develop-436107.iam.gserviceaccount.com",
    // cloudbuild_service_account.id,
  substitutions: {
    _AR_HOSTNAME: "asia-northeast1-docker.pkg.dev",
    _DEPLOY_REGION: "asia-northeast1",
    _PLATFORM: "managed",
    _SERVICE_NAME: "pulumi-cloud-run",
    _TRIGGER_ID: "a62cb1db-f746-4fbd-9658-37cbe0f1f505",
    PROJECT_ID: projectId,
  },
  filename: "cloudbuild.yaml",
  // filename: "pulumi/cloudbuild.yaml",
});

// const _default = new gcp.cloudrun.Service("default", {
//   name: "cloud-run-service-name",
//   location: "asia-northeast1",
//   template: {
//     spec: {
//       containers: [
//         {
//           image: "gcr.io/cloudrun/hello",
//         },
//       ],
//     },
//   },
//   traffics: [
//     {
//       percent: 100,
//       latestRevision: true,
//     },
//   ],
// });
// const sa = new gcp.serviceaccount.Account("sa", {
//   accountId: "cloud-run-pubsub-invoker",
//   displayName: "Cloud Run Pub/Sub Invoker",
// });
// const binding = new gcp.cloudrun.IamBinding("binding", {
//   location: _default.location,
//   service: _default.name,
//   role: "roles/run.invoker",
//   members: ["allUsers"],
// });
// const project = new gcp.projects.IAMBinding("project", {
//   role: "roles/iam.serviceAccountTokenCreator",
//   members: [pulumi.interpolate`serviceAccount:${sa.email}`],
//   project: sa.project,
// });
// const topic = new gcp.pubsub.Topic("topic", { name: "pubsub_topic" });
// const subscription = new gcp.pubsub.Subscription("subscription", {
//   name: "pubsub_subscription",
//   topic: topic.name,
//   pushConfig: {
//     pushEndpoint: _default.statuses.apply((statuses) => statuses[0].url),
//     oidcToken: {
//       serviceAccountEmail: sa.email,
//     },
//     attributes: {
//       "x-goog-version": "v1",
//     },
//   },
// });
