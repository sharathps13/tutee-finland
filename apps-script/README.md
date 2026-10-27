# Website Leads — Google Sheets + email

Every enquiry from the Finland page (the contact form and the Tutee AI chat)
is added as a row to the **Finland Leads** tab of the **Website Leads**
spreadsheet. It is also emailed, formatted as a table, to
business@tuteeconnect.com, with Reply-To set to the student.

```
form → /api/enquiry (Netlify function) → Apps Script web app → Finland Leads tab + email
```

The browser only ever talks to the site's own `/api/enquiry`. The web-app URL
and the shared token live in Netlify's environment, so they never appear in
the page source.

## Columns

Date · Time · Full Name · Phone Number · Email · State · Shortlisted
Universities · Course · Lead Source · Preferred Call Time

- **Date / Time**: India time (IST) when the lead arrives.
- **Course**: study level, course and start, e.g. `Master's – Data Science (Next intake)`.
- **Lead Source**: page and form, plus any campaign tags, e.g.
  `Finland Landing Page – Contact section (google / fi-oct)`.
- **Shortlisted Universities**: the universities picked on the directory page.
- Chat leads only give a name, phone and email, so their other columns show `—`.

## One-time setup (about 5 minutes)

1. Open the **Website Leads** spreadsheet → **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with [`Code.gs`](Code.gs) from this folder, then save.
3. In `setToken()`, replace `PASTE-A-LONG-RANDOM-TOKEN-HERE` with a long random
   string (30+ letters and numbers). Choose **setToken** in the function menu
   and click **Run**. Approve the permissions Google asks for.
4. Choose **setupFinlandLeads** and click **Run**. This creates the
   **Finland Leads** tab with the header row formatted, frozen and filterable.
5. **Deploy → New deployment →** type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
6. In Netlify → the Finland site → **Site configuration → Environment
   variables**, add:
   - `APPS_SCRIPT_URL` = the `/exec` URL from step 5
   - `APPS_SCRIPT_TOKEN` = the same token you used in step 3

   Then **Deploys → Trigger deploy** so the function picks them up.
7. Check it: open `https://<your-site>/api/enquiry` in a browser. It should
   show `"sheet_configured": true`. Then submit a test lead on the page; a row
   should appear in **Finland Leads** and an email should arrive.

## Good to know

- **Editing the script later**: use **Deploy → Manage deployments → Edit →
  Version: New version**. That keeps the same URL. A *new* deployment gets a
  new URL, which would then need updating in Netlify.
- **Email sender**: emails come from the Google account that deployed the
  script. Google limits how many a script can send per day: about 100 on a
  free Gmail account and 1,500 on Google Workspace.
- **Fallback**: if the script can't be reached or rejects the token, the site
  still emails the lead through Resend as before. The student still sees a
  success message, and the Netlify function log records `apps script failed`.
- **Other country pages** can reuse the same script: a lead tagged with another
  country goes to its own `<Country> Leads` tab, which is created automatically.
