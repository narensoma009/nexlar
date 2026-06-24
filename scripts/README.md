# Cloud Shell deploy scripts

These run inside **Azure Cloud Shell** (Bash), which has `az`, `git`, `node`, `npm`, `zip` pre-installed and is already authenticated to your subscription.

## Files

| File | Purpose |
|---|---|
| `vars.sh` | Resource group, web app name, repo URL. Edit once. |
| `setup.sh` | First-time clone + deploy. Wipes any existing `~/pod6-Nexlara` clone. |
| `deploy.sh` | Pull latest + build + zip + deploy. Use for every redeploy. |

## First-time deploy

Open Cloud Shell (portal → `>_` icon → Bash). Then:

```bash
curl -O https://raw.githubusercontent.com/narensoma009/nexlar/main/scripts/vars.sh
curl -O https://raw.githubusercontent.com/narensoma009/nexlar/main/scripts/setup.sh
curl -O https://raw.githubusercontent.com/narensoma009/nexlar/main/scripts/deploy.sh
chmod +x setup.sh deploy.sh

# (Optional) edit vars.sh if you changed the web app name or RG
nano vars.sh

# Put all three in one place so the scripts find each other
mkdir -p ~/pod6-scripts && mv vars.sh setup.sh deploy.sh ~/pod6-scripts/
~/pod6-scripts/setup.sh
```

## Redeploy after code changes

After you push to GitHub:

```bash
~/nexlar/scripts/deploy.sh
```

(Or `~/pod6-scripts/deploy.sh` if you bootstrapped via curl above — same behavior, it just sources the same vars.)

## Verify

```bash
curl https://$WEB_APP.azurewebsites.net/api/health
```

Should return `{"status":"ok"}`.
