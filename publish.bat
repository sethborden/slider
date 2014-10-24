xcopy ..\sdrsh\dist .\dist /s /e /y
copy dist\index.html . /y
copy dist\*.png . /y 
copy dist\*.gif . /y 
sed -i -e "s/\"css/\"dist\/css/g" index.html
sed -i -e "s/all.js/dist\/all.min.js/g" index.html
git add .
git commit -m "Pushing change to live."
git push origin gh-pages

