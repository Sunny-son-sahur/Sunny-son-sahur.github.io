# Server moderation — first pass

Publish the included firestore.rules in the Firebase console before testing. These rules are not automatically deployed.

Owners: use /lock, /unlock, /kick username, /ban username, /unban username, or /help in a channel. Kicks allow rejoining public servers; bans prevent rejoining until removed.

Owners: open Server roles and click a role's permissions to allow sending or message moderation. Moderators can delete messages and send in locked channels, but cannot kick, ban, change roles, or change channel access.

Owners: click the gear next to a channel to lock it or restrict it to selected roles. No selected roles means all members. The owner always has access.

Members can edit or delete their own messages where their permissions allow it. Edits display an edited label.

Validation required: test using owner, moderator, ordinary member, and banned accounts after publishing rules. JavaScript syntax was checked; database rule compilation and multi-account behavior have not been verified in an emulator or live project.

Still pending: channel rename/delete controls, more granular moderation delegation and role hierarchy, server notifications, and the other requested site features.
