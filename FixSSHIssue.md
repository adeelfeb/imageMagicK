Got it 👍 Let me write a **clear guide** you can keep for the future.

---

# 🚀 Fixing GitHub SSH Issues in WSL (Port 22 Blocked)

Sometimes in **WSL (Windows Subsystem for Linux)** you get errors like:

```
ssh: connect to host github.com port 22: No route to host
ssh: Could not resolve hostname github.com: Temporary failure in name resolution
fatal: Could not read from remote repository
```

---

## 🔍 Why this happens

* **Port 22 (default SSH port) is blocked** by:

  * Your network / ISP
  * VPN / firewall rules
  * WSL routing/DNS issues
* GitHub supports **SSH over port 443** (HTTPS port) as a fallback.

---

## 🛠️ Step-by-step Fix

### 1. Open your SSH config

```bash
nano ~/.ssh/config
```

### 2. Add this block

```ssh
Host github.com
  HostName ssh.github.com
  Port 443
  User git
```

👉 This tells SSH:

* When connecting to `github.com`, actually go to `ssh.github.com`
* Use port `443` instead of `22`
* Authenticate as `git` (GitHub standard user for SSH)

### 3. Save and reload

Press `CTRL+O`, `ENTER`, `CTRL+X`.

---

## ✅ Test connection

```bash
ssh -T git@github.com
```

First time it will ask:

```
The authenticity of host '[ssh.github.com]:443' can't be established...
```

Type:

```
yes
```

If success, you’ll see:

```
Hi <your-username>! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## 🚀 Push your code

```bash
git push origin main
```

---

## 🧰 Quick Recovery Commands

If this issue comes again in the future:

```bash
# Open config
nano ~/.ssh/config

# Add/fix GitHub SSH over 443
Host github.com
  HostName ssh.github.com
  Port 443
  User git

# Test connection
ssh -T git@github.com

# Push commits
git push origin main
```

---

⚡ Extra Tip:
If you ever reset WSL or move to a new system, just re-add this `~/.ssh/config` block — that’s usually the only thing you need to fix GitHub connectivity.

---

Perfect 👍 Let’s add the **backup method (HTTPS)** so you’ll never be stuck again.

---

# 🚀 Fixing GitHub SSH Issues in WSL (with HTTPS Backup)

### 🔍 Why backup is useful

* Some strict networks block **SSH entirely** (even on port 443).
* In that case, you can still push/pull using **HTTPS**.
* Downside: HTTPS requires either typing credentials each time OR using a **Personal Access Token (PAT)** instead of a password.

---


## 🛠️ Option 2: Switch to HTTPS (backup method)

### 1. Change remote from SSH → HTTPS

Run this inside your repo:

```bash
git remote set-url origin https://github.com/USERNAME/REPO.git
```

Example for you:

```bash
git remote set-url origin https://github.com/adeelfeb/mockup.git
```

### 2. Use Personal Access Token (instead of password)

* Go to [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens).
* Generate a token (classic or fine-grained) with **repo access**.
* When Git asks for a password during `git push`, paste the token instead of your GitHub password.

👉 You can also cache it with:

```bash
git config --global credential.helper store
```

This saves credentials so you don’t type them every time.

---

## ✅ How to Switch Back to SSH Later

If network allows, switch back to SSH:

```bash
git remote set-url origin git@github.com:adeelfeb/mockup.git
```

---

## 🧰 Quick Recovery Flow

1. If SSH works:

```bash
ssh -T git@github.com
git push origin main
```

2. If SSH fails (port blocked):

```bash
git remote set-url origin https://github.com/adeelfeb/mockup.git
git push origin main
```

(use your GitHub **token** as password)

3. To return to SSH later:

```bash
git remote set-url origin git@github.com:adeelfeb/mockup.git
```

---

⚡ Now you’re covered both ways:
✅ SSH (fast, no password, works over 443)
✅ HTTPS (last-resort backup, works everywhere)

---

Do you want me to make you a **small ready-to-run script** that can toggle your repo between SSH and HTTPS remotes with one command?
