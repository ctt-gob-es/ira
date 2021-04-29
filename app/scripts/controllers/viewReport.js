'use strict';

angular.module('wcagReporter')

  .controller('ViewReportCtrl', function (
    $scope,
    $location,
    $document,
    $http,
    wcag2spec,
    evalModel,
    appState,
    wcagReporterExport,
    toggleCriterionText,
    evalSampleModel,
    evalAuditModel
  ) {
    var htmlBlob;

    $scope.state = appState.moveToState('viewReport');
    $scope.scope = evalModel.scopeModel;
    $scope.explore = evalModel.exploreModel;


    $scope.criteria = evalAuditModel.getCriteriaSorted();

    $scope.allVerifications = function () {
      for (var i = 0; i < $scope.criteria.length; i++) {
        for (var j = 0; j < $scope.criteria[i].hasPart.length; j++) {
          if ($scope.criteria[i].hasPart[j].result.outcome == "earl:cantTell"
            || $scope.criteria[i].hasPart[j].result.outcome == "earl:untested") {
            return false;
          }
        }
      }

      return true;
    }

    $scope.structuredSample = evalSampleModel.structuredSample;
    $scope.randomSample = evalSampleModel.randomSample;

    $scope.missingRequired = function(){

      

      if($scope.scope.website.uraName==""
      || $scope.scope.website.uraDIR3==""
      || $scope.scope.website.uraScope==""
      || $scope.scope.website.scopeDIR3==""
      || $scope.scope.website.responsibleEntity==""
      || $scope.scope.website.responsibleEntityDIR3==""
      || $scope.scope.website.responsiblePerson==""
      || $scope.scope.website.siteName==""
      || $scope.scope.website.url==""
      || $scope.scope.website.siteScope==""
      || $scope.scope.website.revisionDate==""
      || $scope.scope.website.typology==""
      || $scope.scope.website.territorialScope==""
      || $scope.scope.website.evaluationType==""
      || $scope.scope.conformanceTarget==""
      || $scope.scope.reliedUponThematic.length == 0
      || $scope.explore.essentialFunctionality==""){
        return true;
      }
      return false;
    }

    $scope.hasMinimumRandom = function () {
      return $scope.randomSample.webpage.length >= $scope.structuredSample.webpage.length / 10
    }

    $scope.hasAtleastOneType = function () {


      var hasHomePage = false;
      var hasAccesibilityDeclarationPage = false;

      $scope.structuredSample.webpage.forEach(function (page) {
        if (page.pageType == "PAGE_TYPE_1") {
          hasHomePage = true;
        }
        if (page.pageType == "PAGE_TYPE_9") {
          hasAccesibilityDeclarationPage = true;
        }
      });

      $scope.randomSample.webpage.forEach(function (page) {
        if (page.pageType == "PAGE_TYPE_1") {
          hasHomePage = true;
        }
        if (page.pageType == "PAGE_TYPE_9") {
          hasAccesibilityDeclarationPage = true;
        }
      });
      return hasHomePage && hasAccesibilityDeclarationPage;
    };

    $scope.saveAsXlsx = function () {
      try {

        $scope.loading = true;
        $scope.clickDownload = true;

        $http.get($scope.exportJsonUrl, {}).then(function onSuccess(response) {
          $http({
                       //url: 'http://localhost:9001/ods',
            url: $location.protocol() + "://" + $location.host() + ':' + $location.port() + "/ods",
            method: "POST",
            data: response,
            responseType: 'blob'
          }).then(function (response) {
            var data = response.data;
            var a = document.createElement("a");
            document.body.appendChild(a);

            var file = new Blob([data], { type: 'application/vnd.oasis.opendocument.spreadsheet' });

            if (navigator.msSaveBlob) { // IE10+ : (has Blob, but not a[download] or URL)
              $scope.loading = false;
              return navigator.msSaveBlob(file, 'Informe_Revision_Profunidad_v1.ods');
            }

            var fileURL = window.URL.createObjectURL(file);
            a.href = fileURL;
            a.download = 'Informe_Revision_Profunidad_v1.ods';
            a.click();

            $scope.loading = false;
          }).catch(function (response) {
            $scope.loading = false;
          });

        });

      } catch (e) { if (typeof console != 'undefined') console.log(e, $scope.wbout); $scope.loading = false; }
      return $scope.wbout;
    };

    function s2ab(s) {
      if (typeof ArrayBuffer !== 'undefined') {
        var buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
      } else {
        var buf = new Array(s.length);
        for (var i = 0; i != s.length; ++i) buf[i] = s.charCodeAt(i) & 0xFF;
        return buf;
      }
    }

    $scope.filledPages = function () {
      return evalModel.sampleModel.getFilledPages();
    };

    $scope.wcag2specReady = wcag2spec.isLoaded();
    $scope.$on('wcag2spec:langChange', function () {
      $scope.wcag2specReady = true;
    });

    $scope.report = evalModel.reportModel;
    var tpl = [
      '<!DOCTYPE html><html lang="en"><head>' +
      '<meta charset="utf-8">' +
      '<title>' + evalModel.reportModel.title + '</title>' +
      '<script>' + toggleCriterionText.toString()
        .replace('function (a)', 'function toggleCriterionText(a)') + '</script>' +
      '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" />' +
      '<link rel="stylesheet" href="report.css" />' +
      '</head><body><div class="container reporter-view">',
      '</div></body></html>'
    ];

    $scope.$on('reportReady', function (e, data) {
      var html = tpl[0] + data.html() + tpl[1];

      htmlBlob = wcagReporterExport.getBlob(html, 'text/html;charset=utf-8');
      $document.find('#html_download_link')
        .attr(
          'href',
          wcagReporterExport.getBlobUrl(htmlBlob)
        );
    });

    $scope.downloadJsonStart = function () {
      wcagReporterExport.saveBlobIE();
      appState.setPrestineState();
    };

    $scope.saveHtmlBlobIE = function () {
      if (htmlBlob) {
        wcagReporterExport.saveBlobIE(htmlBlob, $scope.exportHtmlFile);
      }
    };



    $scope.saveAsXlsx2 = function () {
      try {

        $scope.loadingxlsx = true;

        //Load JSON
        $http.get($scope.exportJsonUrl, {}).then(function onSuccess(response) {
          $http({
            //url: 'http://localhost:9001/xlsx',
          
            url: $location.protocol() + "://" + $location.host() + ':' + $location.port() + "/xlsx",
            method: "POST",
            data: response,
            responseType: 'blob'
          }).then(function (response) {
            var data = response.data;
            var a = document.createElement("a");
            document.body.appendChild(a);

            var file = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            if (navigator.msSaveBlob) { // IE10+ : (has Blob, but not a[download] or URL)
              $scope.loadingxlsx = false;
              return navigator.msSaveBlob(file, 'Informe_Revision_Profunidad_v1.xlsx');
            }

            var fileURL = window.URL.createObjectURL(file);
            a.href = fileURL;
            a.download = 'Informe_Revision_Profunidad_v1.xlsx';
            a.click();

            $scope.loadingxlsx = false;
          }).catch(function (response) {
            $scope.loadingxlsx = false;
          });

        });

      } catch (e) { if (typeof console != 'undefined') console.log(e, $scope.wbout); $scope.loading = false; }
      return $scope.wbout;
    };


    $scope.exportHtmlFile = wcagReporterExport.getFileName('html');
    $scope.exportJsonUrl = wcagReporterExport.getBlobUrl();
    $scope.exportJsonFile = wcagReporterExport.getFileName();
  });
