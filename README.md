<a href="https://roamjs.com/">
    <img src="https://avatars.githubusercontent.com/u/138642184" alt="RoamJS Logo" title="RoamJS" align="right" height="60" />
</a>

# Otter

**Import Otter.ai recordings into Roam as timestamped transcripts. Pull your latest conversations via the command palette or SmartBlocks, customize label/template formatting, and optionally auto-import new recordings into your Daily Notes.**

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/RoamJS/otter)

## Overview

Otter extension imports your Otter voice transcription into Roam complete with time stamps. [Otter](otter.ai) helps you capture, find, and share important moments from your meetings, interviews, and everyday conversations. Using AI, Otter listens to your voice conversations and generates “smart notes” – accurate, machine-generated text that is synchronized with audio and enriched with speakers tags and summary keywords.

## Setup

Open the Roam Depot Settings and enter your email and password associated with your Otter account. If you signed up on Otter using a Google account, you will need to generate a password and use that email/password pair.

> **Warning:** The extension will need to send your credentials to RoamJS' backend in order to import your notes. We do not store your password - instead we store an encryption key and the password stays encrypted on your device. If you are uncomfortable sharing your credentials with RoamJS' backend, do **not** use this extension.

This is necessary because Otter does not currently support a public-facing API.

## Usage

Hit `CMD+p` (`CTRL+p` on Windows) to open the Roam command palette. Click the new `Import Otter` command. The command will open a dialog displaying the ten most recent recordings tied to your account. Click the one you'd like to import and hit the import button to enter the notes into Roam!

You can customize the format of the transcript into Roam by adjusting the label and/or the template.

The label is the first block that gets created when you import an Otter Note. All the transcripts will be nested under this block. You can configure what the label says on the `roam/js/otter` page. The label supports the following placeholders:

- `{title}` - The title of the note, using `Untitled` if there is none.
- `{summary}` - The summary given by Otter as a list of keywords.
- `{created-date}` - The date the note was created.
  - You could also pass in a custom format after a colon within the placeholder. For example, `{created-date:[[MMMM do, yyyy]]}` will output the created date as a Roam page.
- `{link}` - The link to the note on Otter

By default, the label has a value of `{title} - {summary} ({created-date})`.

The template is the format used for every transcript in the note, each nested under the label. You could configure what the template looks like on the `roam/js/otter` page. The template supports the following placeholders:

- `{start}` - The start time of the transcript
- `{end}` - The end time of the transcript
- `{text}` - The Otter recorded text of the transcript
- `{speaker}` - The speaker linked to the text of the transcript. To use speaker initials instead, add an `initials` argument at the end like `{speaker:initials}`.

By default, the transcript has a value of `{start} - {end} - {text}`.

Sample of default label and template:

![image](https://github.com/RoamJS/otter/assets/3792666/e75f151f-a726-468e-8c82-ca332e3fe79c)

Enabling the `Auto Import Enabled` flag will import any new conversations into Roam into the daily notes page. Be careful - the first time you enable this, it will import your latest 20 conversations since none of them have been marked as imported before.

This extension is integrated with [SmartBlocks](https://roamjs.com/extensions/smartblocks)! It registers a `<%OTTER%>` command for importing your latest unimported conversations.

## Demo

https://github.com/RoamJS/otter/assets/3792666/102d04fd-65d0-4406-980c-ebd0769c3eab

[View on Loom](https://www.loom.com/share/5d8a99a33bed4c149c9300bb1141125e)
