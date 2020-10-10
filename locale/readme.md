# Localization
This catalog contain localization files.

## Updating POT file
File `animation-tweaks.pot` contain all strings from code to be translated.<br>
This file not updated automatically when code is changed.<br>
To update it and get relevant strings you can use `update_pot.sh`.

## How to add translation
Copy `animation-tweaks.pot` file as `<language_code>.po` file (for example: `ru.po`).<br>
Then translate it using your favorite editor (GEdit, POEdit, GTranslator, ...).

## How to update existing translation
First update POT file to have relevant strings.<br>
Then run this command to update translation (for example: ru.po):

    msgmerge -U ru.po animation-tweaks.pot
