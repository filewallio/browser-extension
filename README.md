# filewall.io-chrome-extension
filewall.io chrome extension


office@cyberdock.de
foobar23

MVP


Hey Dirk,

I spend a few hours and got your prototype up and running (I ended up having to make a few changes to get it work). I have put together an estimate for the how much work will be needed to bring this extension to MVP quality. The total comes to 18 hours

* Inspecting token storage / credential remembering edge cases [4.0 hours]
* Build login / register flow with all edge cases [4.0 hours]
  * Force user to login on first launch of extension
  * If authorization fails, indicate "try again later" to the user
  * If "payment required" error is given, send user to placeholder payment page
* Unify UI: help page, better icons, better onclick animation [2.0 hours]
* Download/upload progress indicator (MB/s) and Indicate when processing [1.0 hours]
* Port this extension to work on Firefox [1.0 hour]
* General refactoring of prototype code [4.0 hours]
* Publishing extension to Chrome [2.0 hours]

After this we can talk about more features you would like to include.

Look forward to discussing this with you,
Timothy

Questions:
1. What are the error codes returned on when authorization fails for a user?
2. When exactly will I get the "payment required" error, when trying to upload, on login etc.?
3. Is there an api call to cancel the processing of a document?