# Performance Tracking & Visualization - Set-up 📱
This is a tool to automate performance tracking via <a href="https://developers.google.com/speed/pagespeed/insights/" target="_blank">Page Speed Insights (PSI)</a> and visualize it with <a href="https://datastudio.google.com/" target="_blank">Data Studio</a>.


## What do you need?
* **PSI API Key**. If you need one, you can get one <a href="https://developers.google.com/speed/docs/insights/v5/get-started" target="_blank">here</a>.
* **Google account** (e.g. @gmail.com) to fork the Google Sheets tracker and the Data Studio dashboard.


## Do you want to give it a try? 😁

### #1 Set-up the Google Sheets tracker
> Use your Google account to make a copy of <a href="https://docs.google.com/spreadsheets/d/1YZK-OChRf5cPEnsCqHpzSsEbHzt-MERXxu4y_9R3ZSQ/copy" target="_blank">this Google Sheets template</a> and follow the instructions in the 'How to Use' tab: fill the URL information, give permissions by running an initial manual test and add a time trigger (the video below shows how to set a trigger to automate tests on a daily basis).
<br/><br />
>![How to set a trigger](https://github.com/danieltxok/wpt-lh-perf/blob/master/trigger_demo.gif?raw=true)
<br/><br />
> Give it a few days and the 'Results' tab will automatically be populated with the results for each test.
<br/><br />
> Please, keep in mind that this file will be the main datasource for the dashboard, so I would recommend you to be the only owner and editor of this file. You can later share the dashboard with the rest of the team.

### #2 Set-up the Data Studio dashboard
> Once the data has populated the 'Results' tab for a few days, you can make a copy of <a href="https://datastudio.google.com/u/0/reporting/32e34655-a6ef-434a-a47a-e069e6f7d28c/page/VgD/preview" target="_blank">this Data Studio template</a> and link it to the Google Sheets tracker that you created. To do so, click on 'Create a new data source', select the Google Sheets connector, find your tracker and connect the 'Results' tab. See the video below (with similar steps).
<br /><br />
>![How to link it to the tracker](https://github.com/danieltxok/wpt-lh-perf/blob/master/linking_demo.gif?raw=true)
<br /><br />
> Share the dashboard with the rest of the team and enjoy!


## Credits 🙏
Thanks **@charisTheo** for the videos!
