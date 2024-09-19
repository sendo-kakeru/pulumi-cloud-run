import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const _default = new gcp.cloudrun.Service("default", {
  name: "cloud-run-service-name",
  location: "us-central1",
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
  project: "develop-436107",
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

// (async () => {
//   // new gcp.projects.Service("project", {
//   //   project: "balmy-limiter-431522-u3",
//   //   service: "iam.googleapis.com",
//   //   disableOnDestroy: false,
//   // });

//   //   let github_token_secret: gcp.secretmanager.GetSecretResult;
//   const github_token_secret = await gcp.secretmanager.getSecretVersion({
//     secret: "github-pat-secret",
// //   const github_token_secret = await gcp.secretmanager.getSecret({
// //     secretId: "github-pat-secret",
//   });
// //   const github_token_secret_version = new gcp.secretmanager.SecretVersion(
// //     "github-pat-secret-version",
// //     {
// //       secret: github_token_secret.id,
// //       secretData: std
// //         .file({
// //           input: "github-token.txt",
// //         })
// //         .then((invoke) => invoke.result),
// //     }
// //   );
//   // const p4sa_secretAccessor = gcp.organizations.getIAMPolicy({
//   //     bindings: [{
//   //         role: "roles/secretmanager.secretAccessor",
//   //         members: ["serviceAccount:service-123456789@gcp-sa-cloudbuild.iam.gserviceaccount.com"],
//   //     }],
//   // });
//   // const policy = new gcp.secretmanager.SecretIamPolicy("policy", {
//   //     secretId: github_token_secret.secretId,
//   //     policyData: p4sa_secretAccessor.then(p4sa_secretAccessor => p4sa_secretAccessor.policyData),
//   // });

//   console.log(github_token_secret.name);
//   const my_connection = new gcp.cloudbuildv2.Connection("my-connection", {
//     location: "us-central1",
//     name: "my-connection",
//     githubConfig: {
//       appInstallationId: 54910727,
//       authorizerCredential: {
//         oauthTokenSecretVersion: github_token_secret.name,
//       },
//     },
//   });
//   //   console.log(my_connection.urn)
//   const my_repository = new gcp.cloudbuildv2.Repository("my-repository", {
//     location: "us-central1",
//     name: "my-repository",
//     parentConnection: my_connection.id,
//     remoteUri: "https://github.com/sendo-kakeru/pulumi-cloud-run.git",
//   });
//   //   console.log(my_repository)

//   const build_trigger = new gcp.cloudbuild.Trigger("build-trigger", {
//     name: "my-trigger",
//     location: "global",
//     repositoryEventConfig: {
//       repository: my_repository.id,
//       push: {
//         branch: "main",
//       },
//     },
//     substitutions: {
//       PROJECT_ID: "balmy-limiter-431522-u3",
//     },
//     filename: "cloudbuild.yaml",
//     // filename: "pulumi/cloudbuild.yaml",
//   });

//   const _default = new gcp.cloudrun.Service("default", {
//     name: "cloud-run-service-name",
//     location: "us-central1",
//     template: {
//       spec: {
//         containers: [
//           {
//             image: "gcr.io/cloudrun/hello",
//           },
//         ],
//       },
//     },
//     traffics: [
//       {
//         percent: 100,
//         latestRevision: true,
//       },
//     ],
//   });
//   const sa = new gcp.serviceaccount.Account("sa", {
//     accountId: "cloud-run-pubsub-invoker",
//     displayName: "Cloud Run Pub/Sub Invoker",
//   });
//   const binding = new gcp.cloudrun.IamBinding("binding", {
//     location: _default.location,
//     service: _default.name,
//     role: "roles/run.invoker",
//     members: ["allUsers"],
//   });
//   const project = new gcp.projects.IAMBinding("project", {
//     role: "roles/iam.serviceAccountTokenCreator",
//     members: [pulumi.interpolate`serviceAccount:${sa.email}`],
//     project: sa.project,
//   });
//   const topic = new gcp.pubsub.Topic("topic", { name: "pubsub_topic" });
//   const subscription = new gcp.pubsub.Subscription("subscription", {
//     name: "pubsub_subscription",
//     topic: topic.name,
//     pushConfig: {
//       pushEndpoint: _default.statuses.apply((statuses) => statuses[0].url),
//       oidcToken: {
//         serviceAccountEmail: sa.email,
//       },
//       attributes: {
//         "x-goog-version": "v1",
//       },
//     },
//   });
// })();
