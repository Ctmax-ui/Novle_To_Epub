// Function to fetch HTML content from a URL
async function fetchHtmlContent(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  }
  
  // Function to create EPUB file
  async function createEpub(bookName, bookContent, log) {
    try {
      // Create JSZip instance
      const epub = new JSZip();
  
      // Create META-INF/container.xml
      const containerXml = `<?xml version="1.0" encoding="UTF-8" ?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;
      epub.file('META-INF/container.xml', containerXml);
  
      // Create OEBPS/content.opf
      let opfContent = `<?xml version="1.0" encoding="UTF-8" ?>
      <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>${bookName}</dc:title>
          <dc:language>en</dc:language>
          <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]+'Z'}</meta>
        </metadata>
        <manifest>
      `;
  
      let spineContent = '<spine toc="ncx">';
      let tocContent = `<?xml version="1.0" encoding="UTF-8" ?>
      <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
        <head>
          <meta name="dtb:uid" content="book-id"/>
          <meta name="dtb:depth" content="1"/>
          <meta name="dtb:totalPageCount" content="0"/>
          <meta name="dtb:maxPageNumber" content="0"/>
        </head>
        <docTitle><text>Table of Contents</text></docTitle>
        <navMap>
      `;
  
      bookContent.forEach((chapter, index) => {
        const fileName = `chapter${index + 1}.xhtml`;
        const chapterHtml = `<?xml version="1.0" encoding="UTF-8" ?>
        <html xmlns="http://www.w3.org/1999/xhtml">
          <head><title>${chapter.title}</title></head>
          <body><h1>${chapter.title}</h1>${chapter.content}</body>
        </html>`;
  
        epub.file(`OEBPS/${fileName}`, chapterHtml);
        opfContent += `<item id="${fileName}" href="${fileName}" media-type="application/xhtml+xml"/>`;
        spineContent += `<itemref idref="${fileName}"/>`;
        tocContent += `<navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
          <navLabel><text>${chapter.title}</text></navLabel>
          <content src="${fileName}"/>
        </navPoint>`;
      });
  
      tocContent += `</navMap></ncx>`;
      epub.file('OEBPS/toc.ncx', tocContent);
  
      opfContent += `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/></manifest>`;
      spineContent += `</spine>`;
      opfContent += spineContent + `</package>`;
  
      epub.file('OEBPS/content.opf', opfContent);
  
      // Generate the EPUB Blob
      const epubBlob = await epub.generateAsync({ type: 'blob' });
  
      // Save the EPUB file using FileSaver.js
      saveAs(epubBlob, `${bookName}.epub`);
  
      log.textContent += 'EPUB file created and download triggered.\n';
    } catch (error) {
      console.error(`Error creating EPUB: ${error}`);
      log.textContent += `Error creating EPUB: ${error.message}\n`;
    }
  }
  
  // Event listener when the DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    // Event listener for form submission
    document.getElementById('scrapeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const startUrl = document.getElementById('url').value.trim();
      const log = document.getElementById('log');
  
      let currentPage = startUrl;
      let pageNumber = 1;
      const bookContent = [];
      let bookName = null;
  
      try {
        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
          throw new Error('JSZip library is not loaded.');
        }
  
        // Fetching pages loop
        while (currentPage) {
          log.textContent += `Fetching page ${pageNumber}: ${currentPage}\n`;
          const html = await fetchHtmlContent(currentPage);
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
  
          // Get the book name once from the first page
          if (!bookName) {
            bookName = doc.querySelector('#bookname')?.innerText || 'book';
          }
  
          const title = doc.querySelector('h1')?.innerText || `Chapter ${pageNumber}`;
          const contentElement = doc.querySelector('#htmlContent') || new DocumentFragment();
  
          // Serialize the content to ensure it's well-formed HTML
          const serializer = new XMLSerializer();
          const content = serializer.serializeToString(contentElement);
  
          bookContent.push({ title, content });
  
          log.textContent += `Page ${pageNumber} fetched successfully.\n`;
  
          // Finding next page link
          let nextLink = null;
          doc.querySelectorAll('a').forEach(anchor => {
            if (!anchor.classList.contains('none')) {
              if (anchor.innerText.trim().toLowerCase() === 'next' || anchor.rel.trim() === 'next') {
                nextLink = 'https://www.novelhall.com/' + anchor.getAttribute('href');
              }
            }
          });
  
          currentPage = nextLink ? new URL(nextLink, currentPage).href : null;
          pageNumber++;
        }
  
        log.textContent += 'All pages fetched successfully. Creating the EPUB file...\n';
  
        // Create EPUB file
        await createEpub(bookName, bookContent, log);
  
      } catch (error) {
        console.error(`Error fetching the URL: ${error}`);
        log.textContent += `Error: ${error.message}\n`;
      }
    });
  });
  