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
// const secretAccessBinding = new gcp.projects.IAMBinding(
//   "secret-access-binding",
//   {
//     members: [
//       "serviceAccount:service-1022174569886@gcp-sa-cloudbuild.iam.gserviceaccount.com",
//     ],
//     role: "roles/secretmanager.secretAccessor",
//     project: projectId,
//   }
// );
const member = new gcp.secretmanager.SecretIamMember("member", {
    project: github_token_secret.project,
    secretId: github_token_secret.secretId,
    role: "roles/secretmanager.secretAccessor",
    member: "serviceAccount:service-1022174569886@gcp-sa-cloudbuild.iam.gserviceaccount.com",
});
// const p4sa_secretAccessor = gcp.organizations.getIAMPolicy({
//   bindings: [
//     {
//       role: "roles/secretmanager.secretAccessor",
//       members: [
//         "serviceAccount:service-1022174569886@gcp-sa-cloudbuild.iam.gserviceaccount.com",
//       ],
//     },
//   ],
// });
// const policy = new gcp.secretmanager.SecretIamPolicy("policy", {
//   secretId: github_token_secret.secretId,
//   policyData: p4sa_secretAccessor.then(
//     (p4sa_secretAccessor) => p4sa_secretAccessor.policyData
//   ),
// });

const my_connection = new gcp.cloudbuildv2.Connection("my-connection", {
  location: "asia-northeast1",
  name: "my-connection",
  githubConfig: {
    appInstallationId: 54910727,
    authorizerCredential: {
      oauthTokenSecretVersion: github_token_secret_version.name,
    },
  },
});
//   console.log(my_connection.urn)
const my_repository = new gcp.cloudbuildv2.Repository("my-repository", {
  location: "asia-northeast1",
  name: "my-repository",
  parentConnection: my_connection.id,
  remoteUri: "https://github.com/sendo-kakeru/pulumi-cloud-run.git",
});
//   console.log(my_repository)

const build_trigger = new gcp.cloudbuild.Trigger("build-trigger", {
  name: "my-trigger",
  location: "global",
  repositoryEventConfig: {
    repository: my_repository.id,
    push: {
      branch: "main",
    },
  },
  substitutions: {
    PROJECT_ID: projectId,
  },
  filename: "cloudbuild.yaml",
  // filename: "pulumi/cloudbuild.yaml",
});

const _default = new gcp.cloudrun.Service("default", {
  name: "cloud-run-service-name",
  location: "asia-northeast1",
  template: {
    spec: {
      containers: [
        {
          image: "gcr.io/cloudrun/hello",
        },
      ],
    },
  },
  traffics: [
    {
      percent: 100,
      latestRevision: true,
    },
  ],
});
const sa = new gcp.serviceaccount.Account("sa", {
  accountId: "cloud-run-pubsub-invoker",
  displayName: "Cloud Run Pub/Sub Invoker",
});
const binding = new gcp.cloudrun.IamBinding("binding", {
  location: _default.location,
  service: _default.name,
  role: "roles/run.invoker",
  members: ["allUsers"],
});
const project = new gcp.projects.IAMBinding("project", {
  role: "roles/iam.serviceAccountTokenCreator",
  members: [pulumi.interpolate`serviceAccount:${sa.email}`],
  project: sa.project,
});
const topic = new gcp.pubsub.Topic("topic", { name: "pubsub_topic" });
const subscription = new gcp.pubsub.Subscription("subscription", {
  name: "pubsub_subscription",
  topic: topic.name,
  pushConfig: {
    pushEndpoint: _default.statuses.apply((statuses) => statuses[0].url),
    oidcToken: {
      serviceAccountEmail: sa.email,
    },
    attributes: {
      "x-goog-version": "v1",
    },
  },
});
