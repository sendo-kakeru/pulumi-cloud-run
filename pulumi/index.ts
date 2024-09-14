import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const _default = new gcp.cloudrun.Service("default", {
    name: "cloud-run-service-name",
    location: "us-central1",
    template: {
        spec: {
            containers: [{
                image: "gcr.io/cloudrun/hello",
            }],
        },
    },
    traffics: [{
        percent: 100,
        latestRevision: true,
    }],
    
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
const topic = new gcp.pubsub.Topic("topic", {name: "pubsub_topic"});
const subscription = new gcp.pubsub.Subscription("subscription", {
    name: "pubsub_subscription",
    topic: topic.name,
    pushConfig: {
        pushEndpoint: _default.statuses.apply(statuses => statuses[0].url),
        oidcToken: {
            serviceAccountEmail: sa.email,
        },
        attributes: {
            "x-goog-version": "v1",
        },
    },
});

// (async () => {
//   const github_token_secret = await gcp.secretmanager.getSecretVersion({
//     secret: "github-token-secret",
//   });
//   console.log(github_token_secret);
//   const my_connection = new gcp.cloudbuildv2.Connection("my-connection", {
//     location: "asia-northeast1",
//     name: "my-connection",
//     githubConfig: {
//       // appInstallationId: 123123,
//       authorizerCredential: {
//         oauthTokenSecretVersion: github_token_secret.name,
//         //   oauthTokenSecretVersion: github_token_secret.id,
//       },
//     },
//   });
//   const my_repository = new gcp.cloudbuildv2.Repository("my-repository", {
//     location: "asia-northeast1",
//     name: "my-repo",
//     parentConnection: my_connection.name,
//     remoteUri: "https://github.com/sendo-kakeru/pulumi-gcp-remix",
//   });
//   const repo_trigger = new gcp.cloudbuild.Trigger("repo-trigger", {
//     location: "asia-northeast1",
//     repositoryEventConfig: {
//       repository: my_repository.id,
//       push: {
//         branch: "main",
//       },
//     },

//     filename: "cloudbuild.yaml",
//   });

//   const cloudRunService = new gcp.cloudrun.Service("cloudRunService", {
//     location: "asia-northeast1",
//     template: {
//       spec: {
//         containers: [
//           {
//             //   image: repo_trigger.,
//             image: "gcr.io/balmy-limiter-431522-u3/my-image:latest",
//           },
//         ],
//       },
//     },
//   });
// })();
