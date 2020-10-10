#!/bin/bash

xgettext --from-code utf-8 -k_ -kN_ -o locale/animation-tweaks.pot animation-tweaks@Selenium-H/*.js -o locale/animation-tweaks.pot schemas/*.xml
for pofile in $(find locale -mindepth 2 | egrep .po); do
    msgmerge -o $pofile.new $pofile locale/animation-tweaks.pot
    mv $pofile.new $pofile
done
