require('@ecmal/runtime');
System.import('@ecmal/gapi').then(function(M){
    M.main()
}).catch(function(e){
    console.error(e.stack);
});