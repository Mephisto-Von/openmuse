# OpenMuse privacy policy

Last updated: October 22, 2026

OpenMuse is an open-source personal-agent client. The mobile and desktop apps are **clients**:
they connect to an OpenMuse server that you or your organization run. This policy describes
what the apps do with your information and what the server does when you self-host it. If
someone else operates the server you use, that operator's policy applies to the data on it.

Contact: open an issue at <https://github.com/Mephisto-Von/openmuse/issues>.

## What the app stores on your device

| Data | Where | Why |
| --- | --- | --- |
| Server address you enter | App storage (AsyncStorage) | Reconnect without retyping it |
| Workspace access key | Memory only, never written to disk | Sign in to your workspace |
| Session token | Memory only; the server expires it after 24 hours | Authenticate API calls |
| Files you download or export | App-private storage | Open, share, or re-upload them |

Uninstalling the app removes all of it. The app requests no advertising identifier, contacts,
location, camera, microphone, or health access, and it contains no analytics, crash-reporting,
or advertising SDK. It does not create a profile of you and does not track you across apps.

## What the app sends, and where

The app talks only to the server address you configure. It sends your prompts, the content
you attach, your access key when you sign in, and the requests needed to run the work you
asked for. Nothing is sent to the OpenMuse project or its maintainers. There is no hosted
OpenMuse service behind the app.

If you enable the optional Google connection on your server, the server stores OAuth tokens
and reads the Gmail messages, attachments, and calendar events needed for the actions you
request. Those tokens are encrypted at rest with a key the server operator holds. Google user
data is used only to perform the action you asked for; it is not sold, not used for
advertising, not used to train models, and not shared with third parties except as needed to
carry out your request. The app's use of Google user data follows the
[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
including its Limited Use requirements.

## What the server stores

The server keeps the workspace data needed to do the work: conversation history, task plans,
saved results, browser profiles, workspace files, memories, goals, and connected-account
tokens. It is stored in the data directory or PostgreSQL database the operator configured,
and it stays there until the operator deletes it. The operator decides retention, access, and
backups; self-hosters can delete the workspace by stopping the server and removing the data
directory.

## Network security

Use an HTTPS address for any server reachable beyond your own machine. The app warns before
connecting to an unencrypted remote address. Plain HTTP is supported only so that a server on
your local network can be reached during setup.

## Children

OpenMuse is not directed to children under 13, and the project does not knowingly collect
information from them.

## Changes

Material changes to this policy are published in this file and in the repository history.
Because the apps send no data to the maintainers, the project holds no personal data to
export or delete; requests about data on a server must go to that server's operator.
