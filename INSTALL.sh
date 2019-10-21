#!/bin/bash

#Version 4
#=========


# Default Installation Directory
installDir=~/.local/share/gnome-shell/extensions

# Extension Name and directory
extensionName=animation-tweaks
extensionDir=$extensionName@Selenium-H

echo ""

if [ ! -z $1 ]
then
  installDir=$1
fi

if [ ! -d $installDir ]
then
  if [ -z $2 ]
  then
    echo $installDir"     directory does not exist."
    echo "Would you like to create the directory  (y/n) ? "
    read response
  else
    response=$2
  fi
  
  if [ $response == "y" ]
  then
    mkdir -p $installDir
    if [ $? -eq 0 ]
    then
      echo " Directory Created "
    else
      echo " Error ! "
      exit
    fi
  else
    echo "Exiting ... ! "
    exit
  fi
fi

echo "Installing Extension "$extensionDir
echo "Installation Path "$installDir
echo ""
echo -ne "Removing any Older Version ...   "
rm -rf $installDir"/"$extensionDir
echo "Done"

echo -ne "Copying New Version ...          "
cp -rf $extensionDir $installDir
cp -rf schemas $installDir"/"$extensionDir
cp -rf locale $installDir"/"$extensionDir
echo "Done"

cd $installDir"/"$extensionDir
echo -ne "Compiling Schemas ...            "
glib-compile-schemas schemas
echo "Done"

#echo -ne "Creating Translations ...        "
#cd locale

status="Done"

#for poFile in */
#  do
#    mkdir ${poFile}/LC_MESSAGES
#    msgfmt ${poFile}/$extensionName".po" -o ${poFile}/LC_MESSAGES/$extensionName".mo"   
#    if [ $? != 0 ]; then
#      status="Error"
#      break
#    fi
#  done

if [ "$status" == "Done" ]; then
#  echo -e $status 
  echo "" 
  echo "All Done !"
else
  echo ""
  echo "Extension Installed, Translations not done."
fi 
 
echo ""
echo "Restart GNOME Shell ( Alt + F2 , Press r , Press Enter )."
echo "Enable this extension using GNOME Tweak Tool."
echo ""
