# Day 3 – Memory, Tools & Gmail Agents (JavaScript + Docker)

JavaScript port of the Python demos in `Day 3/` of the Chennai AI workshop repo, using
LangChain.js, LangGraph.js and Gemini.

| Python file          | JS file                 | npm script         | Needs Gmail? |
|----------------------|-------------------------|--------------------|--------------|
| `fix_memory.py`      | `src/fixMemory.js`      | `memory`           | No           |
| `nf_vs_tool.py`      | `src/nfVsTool.js`       | `tools`            | No (no API key either) |
| `gmail_test.py`      | `src/gmailTest.js`      | `gmail:test`       | Yes          |
| `gmail_classify.py`  | `src/gmailClassify.js`  | `gmail:classify`   | Yes          |
| `gmail_langgraph.py` | `src/gmailLanggraph.js` | `gmail:graph`      | Yes          |
| `gmail_agent_test.py`| `src/gmailAgent.js`     | `gmail:agent`      | Yes          |

## Setup

```bash
cp .env.example .env      # Windows: copy .env.example .env
```

Fill in `.env`:

- `GEMINI_API_KEY` – from Google AI Studio
- `GEMINI_MODEL` – a model your key can use (default `gemini-flash-lite-latest`)
- `GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD` – IMAP needs a Gmail **App Password**
  (Google Account → Security → 2-Step Verification → App passwords). Your normal password won't work.

## Run with Docker

```bash
docker compose build

docker compose run --rm app npm run memory
docker compose run --rm app npm run tools
docker compose run --rm app npm run gmail:test
docker compose run --rm app npm run gmail:classify
docker compose run --rm app npm run gmail:graph
docker compose run --rm app npm run gmail:agent
docker compose run --rm app npm run gmail:agent -- "Find emails about 'invoice' and draft a thank-you reply"
```

`docker compose up` runs the default demo (`memory`). `src/` is mounted into the container, so
editing a file doesn't need a rebuild; changing `package.json` does.

## Run without Docker

```bash
npm install
npm run memory
```

Needs Node 20+.

## Notes

- The agent only **drafts** replies. Nothing here sends email.
- Reading mail uses IMAP via `imapflow` and `mailparser`, the JS equivalent of Python's `imaplib` and `email`.
- Subject search works like the Python version (`SUBJECT "<query>"`). Searching the body as well is a one-line change in `src/gmail.js` (`{ body: query }`, or `{ or: [{ subject }, { body }] }`).
- `.env` is git-ignored and Docker-ignored, so your keys never end up in the image.
