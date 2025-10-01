# Curve Fitter UI

![Curve preview](image.png)

A React + D3 single page app that streams yield curves over SSE and renders the live fit.

## Local Development

- Install dependencies: `npm install`
- Start the dev server: `npm run dev`
- The Vite proxy forwards `/curves` requests to `http://localhost:8000`.

## Docker

Build a local image:

```bash
docker build -t curve-fitter-ui:latest .
docker run --rm -p 8080:80 \
  -e STREAM_URL="http://localhost:8000/curves/stream" \
  -e APP_ENV="prd" \
  curve-fitter-ui:latest
```

### Runtime configuration

- `STREAM_URL` controls the SSE endpoint the UI connects to. Override it when starting the container, e.g. `-e STREAM_URL="http://backend:8000/curves/stream"`.
- `APP_ENV` labels the environment (`prd` by default). The UI reads both values from `config.js`, which is generated from `config.template.js` during container start-up.

## AWS Lambda

- Run `./run.sh lambda` (or `npm run build:lambda`) to build the SPA and stage the Lambda bundle under `lambda/build`.
- The Lambda bundle is archived as `lambda/curve-fitter-ui-lambda.zip`; upload it when creating the function.
- Configure the function with runtime **Node.js 18.x** (or newer) and handler `lambda/handler.handler`.
- Provide `STREAM_URL` and `APP_ENV` environment variables to override the defaults used by `config.js`. Without overrides the Lambda bundle points to `http://localhost:8080/curves/stream`.
- Attach an HTTP API (or Function URL) to serve the UI; the handler responds to `GET`/`HEAD` and serves the prebuilt assets.
- Client-side routes fall back to `index.html`, so deep links keep working.

## Continuous Delivery

The GitHub Actions workflow at `.github/workflows/docker-publish.yml` now runs quality gates, publishes container images, and updates AWS ECS.

### Quality gates (Sonar)
- Runs when `SONAR_TOKEN`, `SONAR_PROJECT_KEY`, and (for SonarCloud) `SONAR_ORGANIZATION` secrets are present.
- Installs dependencies, builds the app, and executes the Sonar analysis via `sonarsource/sonarcloud-github-action`.
- Skips automatically when the secrets are missing (for example on forks).

### Container publishing
- Always builds a multi-architecture image (`linux/amd64`, `linux/arm64`).
- Pushes image tags to GHCR on pushes to `main` and version tags (`v*`); pull requests build only.
- When AWS credentials are supplied, the same image is tagged and pushed to Amazon ECR (`${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com/<repository>`). Override the repository name via the `ECR_REPOSITORY` repository variable if you do not want the default `curve-fitter-ui`.

### AWS ECS deploy
- On pushes to `main`, if an ECR image is available, the workflow registers a new task definition revision with the fresh image and updates the target ECS service.
- Requires secrets for the cluster, service, task definition family, and container name. The job waits for the service to stabilise before finishing.

### Required secrets / variables
- `SONAR_TOKEN`, `SONAR_PROJECT_KEY`, `SONAR_ORGANIZATION`, and (optional) `SONAR_HOST_URL` for the Sonar job.
- `AWS_ROLE_TO_ASSUME`, `AWS_ACCOUNT_ID`, `AWS_REGION`, `AWS_ECS_CLUSTER`, `AWS_ECS_SERVICE`, `AWS_ECS_TASK_DEFINITION`, `AWS_ECS_CONTAINER_NAME` for the registry push and ECS deployment.
- (Optional) repository variable `ECR_REPOSITORY` to override the default ECR repository name.

Ensure `Settings → Actions → General → Workflow permissions` grants the default `GITHUB_TOKEN` **Read and write** access to packages so GHCR pushes succeed.

---

Olivier Bonnemaison · https://github.com/bonnemai/curvefitter_ui
