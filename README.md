# taskboard-api (mock)

A pretend REST microservice for the [Taskboard web app](https://github.com/ArchmeBen/test-repo). It uses only built-in Node modules, so there's nothing to install. Tasks live in memory and reset on restart.

## Run it

Requires Node 20+.

```sh
npm start          # http://localhost:3000
npm run dev        # restarts on file changes
npm test
```

Environment variables:

| Variable     | Default | Purpose                                |
| ------------ | ------- | -------------------------------------- |
| `PORT`       | `3000`  | Port to listen on                      |
| `LATENCY_MS` | `0`     | Fake delay added to every request      |

## Endpoints

| Method   | Path              | Description                                   |
| -------- | ----------------- | --------------------------------------------- |
| `GET`    | `/health`         | Health check                                  |
| `GET`    | `/tasks`          | List tasks (`?status=open` or `?status=done`) |
| `GET`    | `/tasks/stats`    | Total, open and done counts                   |
| `GET`    | `/tasks/:id`      | Get one task                                  |
| `POST`   | `/tasks`          | Create a task                                 |
| `PATCH`  | `/tasks/:id`      | Update any of a task's fields                 |
| `DELETE` | `/tasks/:id`      | Delete a task                                 |

A task looks like this:

```json
{ "id": 1, "title": "Set up project repo", "priority": "high", "done": true, "assignee": "Alex" }
```

`priority` is `low`, `medium` or `high`. On create, only `title` is required; `priority` defaults to `medium` and `assignee` to `You`. Errors come back as `{ "error": "message" }` with a 4xx status. CORS is open to all origins, so the web app can call it from anywhere.

## Example

```sh
curl -X POST localhost:3000/tasks -H 'Content-Type: application/json' \
  -d '{"title":"Try the API","priority":"low"}'
curl -X PATCH localhost:3000/tasks/6 -H 'Content-Type: application/json' -d '{"done":true}'
```
