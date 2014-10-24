xcopy ..\sdrsh\dist .\dist /s /e /y
copy dist\index.html . /s /e /y
copy dist\*.png . /s /e /y
sed -i "s/\"css/\"dist\/css/g" index.html
sed -i "s/all.js/dist\/all.min.js/g" index.html
git add .
git commit -m "Pushing change to live."
git push gh-pages origin

