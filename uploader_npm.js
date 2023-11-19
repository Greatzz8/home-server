var HugeUploader=require('huge-uploader');
let upload=document.getElementById("imgupload");
let progressbar=document.getElementById("upload-progress");
upload.addEventListener('change',function (){
    let file=upload.files[0];
    if(check_special_case(file.name)){
        alert("File can not contain special characters: &, /");
        return;
    }
    let move_path=current_path.join("/");
    let uploader=new HugeUploader({endpoint:"http://127.0.0.1:8081/upload",file:file,postParams:{'move_to':move_path,'filename':file.name},chunkSize:5,headers:my_header});
    uploader.on('error', (err) => {
        console.error('Something bad happened', err.detail);
    });

    uploader.on('progress', (progress) => {
        progressbar.style.visibility="visible";
        progressbar.innerHTML=`<div class='progress-bar' style='width:${progress.detail}%'>Uploading... ${progress.detail}%</div>`
        if(progress.detail==100){
            progressbar.style.visibility="hidden";
            const done=new CustomEvent("done",{detail:uploader.headers['uploader-file-id']});
            progressbar.dispatchEvent(done);
        }
    });

    uploader.on('finish', (body) => {
        // Somehow not working
        // progressbar.style.visibility="hidden";
        // const done=new Event("done");
        // progressbar.dispatchEvent(done);
    });
})

