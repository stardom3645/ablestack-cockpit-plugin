Name: ablecube
Version: %{version}
Release: %{release}
Source0: %{name}-%{version}.tar.gz
Summary: ablestack cockpit plugin

Group: ABLECLOUD
License: None
URL: https://github.com/ablecloud-team/ablestack-cockpit-plugin.git
BuildRoot: %(mktemp -ud %{_tmppath}/%{name}-%{version}-%{release}-XXXXXX)

BuildRequires: /bin/bash
Requires: /bin/bash

%description
AbleStack Cockpit Plugin

%define debug_package %{nil}
%define _unpackaged_files_terminate_build 0
%define _missing_doc_files_terminate_build 0

%prep
%setup -q

%build

%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT/usr/share/cockpit/ablestack

cp -a {README.md,node_modules,images,main.html,manifest.json,sample,shell,src,tools,python,index.html,index.js,main-glue.html,main-glue-no-permission.html} \
    $RPM_BUILD_ROOT/usr/share/cockpit/ablestack
find $RPM_BUILD_ROOT/usr/share/cockpit/ablestack \( -name ".DS_Store" -o -name "__pycache__" -o -name "*.pyc" \) -exec rm -rf {} +

%post
/usr/share/cockpit/ablestack/tools/makerpm/ablestack.sh &

%clean
rm -rf $RPM_BUILD_ROOT

%files
%defattr(-,root,root,-)
%attr(0755,root,root) /usr/share/cockpit/ablestack/*

%changelog
* Tue Dec 10 2025 ABLESTACK <ablecloud@ablecloud.io> - %{version}-%{release}
- Auto build with custom version/release
