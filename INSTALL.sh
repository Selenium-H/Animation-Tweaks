#!/bin/bash

echo "Removing any Older Version"
rm -rf ~/.local/share/gnome-shell/extensions/animation-tweaks@Selenium-H
echo "Done"

echo "Copying New Version"
cp -rf animation-tweaks@Selenium-H ~/.local/share/gnome-shell/extensions/
echo "Done"

cd ~/.local/share/gnome-shell/extensions/animation-tweaks@Selenium-H
echo "Compiling Schemas"
glib-compile-schemas schemas
echo "All Done !"

