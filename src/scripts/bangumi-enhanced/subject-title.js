

function subjectEp_replaceH1Title() {
        const h1Link = document.querySelector("#headerSubject > h1 > a");
        if (h1Link && h1Link.title.trim() !== "" && h1Link.text.trim() !== h1Link.title.trim()) {
            const originalTitleText = h1Link.text;
            h1Link.text = h1Link.title; // Set Chinese title

            const smallOriginalTitle = document.createElement("small");
            smallOriginalTitle.innerText = ` ${originalTitleText} `; // Add space for separation
            smallOriginalTitle.style.fontSize = "0.65em"; // Make it smaller
            smallOriginalTitle.style.opacity = "0.8";
            h1Link.parentNode.insertBefore(smallOriginalTitle, h1Link.nextSibling);

            // Update right side info link if it exists and shows Japanese title
            const rightTitleLink = document.querySelector("#subject_inner_info > a.title");
            if (rightTitleLink && rightTitleLink.title === originalTitleText) {
                 // This part of script2 was: rightTitle.innerHTML = rightTitle.innerHTML.replace(rightTitle.title, h1Title.text);
                 // It seems it intended to replace the display text if it matched the old h1 title.
                 // Let's ensure it correctly refers to the new h1Link.text which is Chinese.
                 if (rightTitleLink.innerText.includes(originalTitleText)) {
                    rightTitleLink.innerHTML = rightTitleLink.innerHTML.replace(originalTitleText, h1Link.text);
                 }
            }
        }
    }



export { subjectEp_replaceH1Title };
