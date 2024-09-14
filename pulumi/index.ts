import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const my_connection = new gcp.cloudbuildv2.Connection("my-connection", {
    location: "us-central1",
    name: "my-connection",
    githubConfig: {
        appInstallationId: 123123,
        authorizerCredential: {
            oauthTokenSecretVersion: "projects/my-project/secrets/github-pat-secret/versions/latest",
        },
    },
});
const my_repository = new gcp.cloudbuildv2.Repository("my-repository", {
    name: "my-repo",
    parentConnection: my_connection.id,
    remoteUri: "https://github.com/sendo-kakeru/pulumi-cloud-run",
});

const build_trigger = new gcp.cloudbuild.Trigger("build-trigger", {
    name: "my-trigger",
    location: "global",
    repositoryEventConfig: {
        repository: my_repository.id,
        push: {
            branch: "main",
        },
    },
    build: {
        steps: [
            {
                name: "gcr.io/cloud-builders/gsutil",
                args: [
                    "cp",
                    "gs://mybucket/remotefile.zip",
                    "localfile.zip",
                ],
                timeout: "120s",
                secretEnvs: ["MY_SECRET"],
            },
            {
                name: "ubuntu",
                script: "echo hello",
            },
        ],
        source: {
            storageSource: {
                bucket: "mybucket",
                object: "source_code.tar.gz",
            },
        },
        tags: [
            "build",
            "newFeature",
        ],
        substitutions: {
            _FOO: "bar",
            _BAZ: "qux",
        },
        queueTtl: "20s",
        logsBucket: "gs://mybucket/logs",
        secrets: [{
            kmsKeyName: "projects/myProject/locations/global/keyRings/keyring-name/cryptoKeys/key-name",
            secretEnv: {
                PASSWORD: "ZW5jcnlwdGVkLXBhc3N3b3JkCg==",
            },
        }],
        availableSecrets: {
            secretManagers: [{
                env: "MY_SECRET",
                versionName: "projects/myProject/secrets/mySecret/versions/latest",
            }],
        },
        artifacts: {
            images: ["gcr.io/$PROJECT_ID/$REPO_NAME:$COMMIT_SHA"],
            objects: {
                location: "gs://bucket/path/to/somewhere/",
                paths: ["path"],
            },
            npmPackages: [{
                packagePath: "package.json",
                repository: "https://us-west1-npm.pkg.dev/myProject/quickstart-nodejs-repo",
            }],
            pythonPackages: [{
                paths: ["dist/*"],
                repository: "https://us-west1-python.pkg.dev/myProject/quickstart-python-repo",
            }],
            mavenArtifacts: [{
                repository: "https://us-west1-maven.pkg.dev/myProject/quickstart-java-repo",
                path: "/workspace/my-app/target/my-app-1.0.SNAPSHOT.jar",
                artifactId: "my-app",
                groupId: "com.mycompany.app",
                version: "1.0",
            }],
        },
        options: {
            sourceProvenanceHashes: ["MD5"],
            requestedVerifyOption: "VERIFIED",
            machineType: "N1_HIGHCPU_8",
            diskSizeGb: 100,
            substitutionOption: "ALLOW_LOOSE",
            dynamicSubstitutions: true,
            logStreamingOption: "STREAM_OFF",
            workerPool: "pool",
            logging: "LEGACY",
            envs: ["ekey = evalue"],
            secretEnvs: ["secretenv = svalue"],
            volumes: [{
                name: "v1",
                path: "v1",
            }],
        },
    },
});

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
