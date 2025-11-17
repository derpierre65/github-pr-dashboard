<template>
  <q-page class="q-pa-lg tw:container tw:max-w-screen-md tw:mx-auto q-gutter-y-md">
    <h1 class="text-h4">
      Filter query language
    </h1>

    <p>
      You can filter pull requests using a simple query language similar to Jira.
      Comparisons are case-insensitive. Strings may be quoted with double quotes.
      Quoting is recommended when values contain spaces or special characters (like a minus sign).
    </p>

    <h2 class="text-h5">
      Examples
    </h2>
    <ul class="q-pl-md tw:list-disc">
      <li><code>createdAt &gt; -48h</code> = Pull requests created within the last 48 hours</li>
      <li><code>createdAt &lt; -48h</code> = Pull requests created more than 48 hours ago</li>
      <li><code>repository = "my-repo"</code> = Pull requests from the repository "my-repo"</li>
      <li><code>labels = "bug"</code> = Pull requests with the label "bug"</li>
      <li><code>author IN ("@me")</code> or <code>author = @me</code> = Your own pull requests</li>
    </ul>

    <h2 class="text-h5">
      Operators
    </h2>
    <ul class="q-pl-md tw:list-disc">
      <li><code>=</code>, <code>==</code> equals</li>
      <li><code>!=</code>, <code>&lt;&gt;</code> not equals</li>
      <li><code>~</code> contains (substring). Example: <code>title ~ "WIP"</code></li>
      <li>
        <code>IN (...)</code>, <code>NOT IN (...)</code> = List membership.<br>
        Example: <code>author IN ("alice", "bob")</code>
      </li>
      <li><code>&gt;</code>, <code>&gt;=</code>, <code>&lt;</code>, <code>&lt;=</code> = Comparison</li>
      <li><code>AND</code>, <code>OR</code> (also <code>&amp;&amp;</code>, <code>||</code>) = Combine expressions</li>
      <li>
        Parentheses are supported.<br>
        Example: <code>(labels = bug OR labels = enhancement) AND isDraft = false</code>
      </li>
    </ul>

    <h2 class="text-h5">
      Relative time and durations
    </h2>
    <p>
      You can compare date fields against relative durations. Durations are converted relative to “now”.<br>
      Examples: <code>-48h</code>, <code>-7d</code>, <code>-1w</code>, <code>-30min</code><br>
      Supported units:
    </p>
    <ul class="tw:list-disc q-pl-md">
      <li>Years: <code>y</code>, <code>year</code>, <code>years</code></li>
      <li>Months: <code>mo</code>, <code>month</code>, <code>months</code></li>
      <li>Weeks: <code>w</code>, <code>week</code>, <code>weeks</code></li>
      <li>Days: <code>d</code>, <code>day</code>, <code>days</code></li>
      <li>Minutes: <code>m</code>, <code>min</code>, <code>mins</code>, <code>minute</code>, <code>minutes</code></li>
      <li>Seconds: <code>s</code>, <code>sec</code>, <code>secs</code>, <code>second</code>, <code>seconds</code></li>
    </ul>

    <h2 class="text-h5">
      Variables
    </h2>
    <p>
      You can use variables in your query. Supported variables:
    </p>
    <ul class="tw:list-disc q-pl-md">
      <li><code>@me</code> = Your GitHub username.</li>
    </ul>

    <h2 class="text-h5">
      Fields
    </h2>
    <p>These fields can be used on the left-hand side of comparisons:</p>
    <ul class="tw:list-disc q-pl-md">
      <li>
        <code>title</code> (string)
      </li>
      <li>
        <code>author</code> (string)
      </li>
      <li>
        <code>org</code> (string)
      </li>
      <li>
        <code>repo</code> (string)
      </li>
      <li>
        <code>labels</code> (array of strings) - Labels assigned to the pull request.
      </li>
      <li>
        <code>isDraft</code> (boolean)
      </li>
      <li>
        <code>totalCommentsCount</code> (number)
      </li>
      <li>
        <code>number</code> (number) - Pull Request ID.
      </li>
      <li>
        <code>calculatedReviewStatus</code> ("approved" | "changes_requested" | "pending").
      </li>
      <li>
        <code>requestedReviewers</code> (array of usernames)
      </li>
      <li>
        <code>latestOpinionatedReviews</code> (array of strings) - Array of usernames who reviewed this pull request.
      </li>
      <li>
        <code>approvedBy</code> (array of strings) - Array of usernames who approved this pull request.
      </li>
      <li>
        <code>changesRequestedBy</code> (array of strings) - Array of usernames who requested changes this pull request.
      </li>
      <li>
        <code>statusCheckRollup</code> ("SUCCESS" | "PENDING" | "FAILURE" | "UNKNOWN")
      </li>
      <li>
        <code>state</code> (string) - Currently "OPEN"
      </li>
      <li>
        <code>merged</code> (boolean) - Currently always false
      </li>
      <li>
        <code>createdAt</code> (date) - Pull request creation date.
      </li>
      <li>
        <code>updatedAt</code> (date) - Pull request last update date.
      </li>
      <li>
        <code>lastEditedAt</code> (date) - Pull request last edit date.
      </li>
    </ul>

    <h2 class="text-h6">
      Aliases
    </h2>

    <ul class="tw:list-disc q-pl-md">
      <li><code>userReviewRequested</code> = <code>requestedReviewers</code></li>
      <li><code>reviewedBy</code> = <code>latestOpinionatedReviews</code></li>
      <li><code>reviewStatus</code> = <code>calculatedReviewStatus</code></li>
      <li><code>comments</code> = <code>totalCommentsCount</code></li>
      <li><code>draft</code> = <code>isDraft</code></li>
      <li><code>repository</code> = <code>repo</code></li>
      <li><code>organization</code> = <code>org</code></li>
    </ul>

    <h2 class="text-h5">
      More examples
    </h2>
    <pre class="q-pa-sm bg-grey-10 rounded-borders overflow-auto">
createdAt &gt;= -3d AND reviewStatus IN ("approved", "pending")
labels NOT IN ("wip", "blocked") AND isDraft = false
repository = "my-repository" AND author IN ("@me", "alice")
reviewedBy = coderabbitai OR userReviewRequested IN ("bob")
comments &gt;= 10 AND title ~ "hotfix"
</pre>

    <p>
      Tip: comparisons with strings are case-insensitive. For array fields like
      <code>labels</code>, equality checks whether the value is present in the array.
    </p>
  </q-page>
</template>


