import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

new gcp.projects.Service("project", {
  project: "balmy-limiter-431522-u3",
  service: "iam.googleapis.com",
  disableOnDestroy: false,
});

const my_connection = new gcp.cloudbuildv2.Connection("my-connection", {
  location: "us-central1",
  name: "my-connection",
  githubConfig: {
    appInstallationId: 53464940,
    authorizerCredential: {
      oauthTokenSecretVersion:
        "projects/balmy-limiter-431522-u3/secrets/github-pat-secret/versions/latest",
    },
  },
});
const my_repository = new gcp.cloudbuildv2.Repository("my-repository", {
  name: "my-repository",
  parentConnection: my_connection.name,
  remoteUri: "https://github.com/sendo-kakeru/pulumi-cloud-run.git",
});

const build_trigger = new gcp.cloudbuild.Trigger("build-trigger", {
  name: "my-trigger",
  location: "global",
  repositoryEventConfig: {
    repository: my_repository.name,
    push: {
      branch: "main",
    },
  },
  substitutions: {
    PROJECT_ID: "balmy-limiter-431522-u3",
  },
  filename: "cloudbuild.yaml",
});

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
